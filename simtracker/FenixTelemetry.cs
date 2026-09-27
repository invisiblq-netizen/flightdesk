using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using FSUIPC;

// Read-only access through the WASM variable catalogue. ReadLVar alone cannot
// distinguish a missing variable from a previously returned numeric value.
internal sealed class FenixTelemetry : IDisposable
{
    private readonly string[] names;
    private long lastValuesAt;
    private long recallPressedAt;
    private long generation;
    private long catalogueSince;
    private string aircraft = "";
    private long aircraftSince;
    private FsLVar? recall;
    private bool started;

    public FenixTelemetry()
    {
        using var resource = Assembly.GetExecutingAssembly().GetManifestResourceStream("FenixVariables")!;
        names = JsonSerializer.Deserialize<Dictionary<string, string>>(resource)!.Keys.ToArray();
        try
        {
            MSFSVariableServices.OnValuesChanged += (_, _) => Interlocked.Exchange(ref lastValuesAt, Now());
            MSFSVariableServices.OnVariableListChanged += (_, _) =>
            {
                Interlocked.Increment(ref generation);
                Interlocked.Exchange(ref catalogueSince, Now());
                Interlocked.Exchange(ref lastValuesAt, 0);
                Interlocked.Exchange(ref recallPressedAt, 0);
                recall = null;
            };
            MSFSVariableServices.Init();
            MSFSVariableServices.Start();
            started = true;
        }
        catch { started = false; }
    }

    public object Read(string title, bool positionAvailable)
    {
        var now = Now();
        if (title != aircraft)
        {
            aircraft = title; aircraftSince = now;
            Interlocked.Increment(ref generation);
            Interlocked.Exchange(ref recallPressedAt, 0);
        }
        var values = new Dictionary<string, double>();
        var isFenix = Regex.IsMatch(title, @"Fenix\s*A?3(19|20|21)|FNX[_ -]?3(19|20|21)", RegexOptions.IgnoreCase);
        var status = !positionAvailable ? "Simulator disconnected" : !isFenix ? "Waiting for a Fenix A319/A320/A321" : "Waiting for Fenix WASM data";
        var available = false;
        try
        {
            if (started && MSFSVariableServices.IsRunning && isFenix && positionAvailable)
            {
                if (MSFSVariableServices.LVars.Exists("S_ECAM_RCL"))
                {
                    var current = MSFSVariableServices.LVars["S_ECAM_RCL"];
                    if (!ReferenceEquals(current, recall))
                    {
                        recall = current;
                        current.OnValueChanged += (_, _) =>
                        {
                            if (ReferenceEquals(current, recall) && current.Value == 1)
                                Interlocked.Exchange(ref recallPressedAt, Now());
                        };
                    }
                }
                var lastUpdate = Interlocked.Read(ref lastValuesAt);
                if (now - Interlocked.Read(ref catalogueSince) >= 2000 && now - aircraftSince >= 2000 && lastUpdate >= aircraftSince && now - lastUpdate <= 5000)
                {
                    foreach (var name in names)
                    {
                        if (!MSFSVariableServices.LVars.Exists(name)) continue;
                        var value = MSFSVariableServices.LVars[name].Value;
                        if (double.IsFinite(value)) values[name] = value;
                    }
                    available = values.ContainsKey("S_ENG_MODE") && values.ContainsKey("S_MIP_GEAR");
                    status = available ? "Fenix cockpit connected" : "Fenix variables unavailable";
                }
            }
        }
        catch { values.Clear(); available = false; status = "Fenix WASM data unavailable"; }
        if (!available) values.Clear();
        return new { available, aircraft = title, status, sampledAt = now, generation = Interlocked.Read(ref generation), values, recallPressedAt = available ? Interlocked.Read(ref recallPressedAt) : 0 };
    }
    private static long Now() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
    public void Dispose() { try { if (started) MSFSVariableServices.Stop(); } catch { } }
}
