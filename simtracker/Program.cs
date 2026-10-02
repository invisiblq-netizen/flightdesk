using System.Text.Json;
using FSUIPC;

using var fenix = new FenixTelemetry();
var aircraftTitle = new Offset<string>(0x3D00, 256);
var sampleLimit = args.FirstOrDefault(arg => arg.StartsWith("--samples="));
var remaining = sampleLimit is null ? int.MaxValue : int.Parse(sampleLimit.Split('=')[1]);
var latitude = new Offset<long>(0x0560);
var longitude = new Offset<long>(0x0568);
var groundSpeed = new Offset<uint>(0x02B4);
var verticalSpeed = new Offset<int>(0x02C8);
var onGround = new Offset<ushort>(0x0366);
var heading = new Offset<uint>(0x0580);
var altitude = new Offset<long>(0x0570);
var com1ActiveFrequency = new Offset<uint>(0x05C4);
var engine1Combustion = new Offset<byte>(0x0894);
var engine1N2 = new Offset<ushort>(0x0896);
var engine2Combustion = new Offset<byte>(0x0924);
var engine2N2 = new Offset<ushort>(0x0926);
var lights = new Offset<ushort>(0x0D0C);
var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
var stopping = false;
Console.CancelKeyPress += (_, eventArgs) => { eventArgs.Cancel = true; stopping = true; };

while (!stopping && remaining-- > 0)
{
    try
    {
        if (!FSUIPCConnection.IsOpen) FSUIPCConnection.Open();
        FSUIPCConnection.Process();
        var lat = new FsLatitude(latitude.Value).DecimalDegrees;
        var lon = new FsLongitude(longitude.Value).DecimalDegrees;
        var positionAvailable = double.IsFinite(lat) && double.IsFinite(lon)
            && Math.Abs(lat) <= 90 && Math.Abs(lon) <= 180
            && !(Math.Abs(lat) < 0.00001 && Math.Abs(lon) < 0.00001);
        var headingDegrees = heading.Value / 4294967296d * 360d;
        var altitudeFeet = new FsAltitude(altitude.Value).Feet;
        var groundSpeedKnots = groundSpeed.Value / 65536d * 1.9438444924d;
        var verticalSpeedFeetPerMinute = verticalSpeed.Value / 256d * 196.8503937d;
        double? frequencyMhz = com1ActiveFrequency.Value > 100_000_000
            ? com1ActiveFrequency.Value / 1_000_000d
            : (double?)null;
        var engine1N2Percent = Math.Clamp(engine1N2.Value / 16384d * 100d, 0, 100);
        var engine2N2Percent = Math.Clamp(engine2N2.Value / 16384d * 100d, 0, 100);
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            connected = positionAvailable,
            cockpit = fenix.Read(aircraftTitle.Value, positionAvailable),
            latitude = positionAvailable ? lat : (double?)null,
            longitude = positionAvailable ? lon : (double?)null,
            onGround = onGround.Value != 0,
            groundSpeedKnots = Math.Round(groundSpeedKnots, 1),
            verticalSpeedFeetPerMinute = Math.Round(verticalSpeedFeetPerMinute),
            headingDegrees = Math.Round(headingDegrees, 1),
            altitudeFeet = Math.Round(altitudeFeet),
            com1FrequencyMhz = frequencyMhz.HasValue ? Math.Round(frequencyMhz.Value, 3) : (double?)null,
            engine1Combustion = engine1Combustion.Value != 0,
            engine1N2Percent = Math.Round(engine1N2Percent, 1),
            engine2Combustion = engine2Combustion.Value != 0,
            engine2N2Percent = Math.Round(engine2N2Percent, 1),
            beaconLightOn = (lights.Value & 0b10) != 0,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }, jsonOptions));
    }
    catch
    {
        try { if (FSUIPCConnection.IsOpen) FSUIPCConnection.Close(); } catch { }
        Console.WriteLine(JsonSerializer.Serialize(new { connected = false, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }, jsonOptions));
    }
    Thread.Sleep(250);
}

try { if (FSUIPCConnection.IsOpen) FSUIPCConnection.Close(); } catch { }
