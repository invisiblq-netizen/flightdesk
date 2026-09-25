using System.Text.Json;
using FSUIPC;

var latitude = new Offset<long>(0x0560);
var longitude = new Offset<long>(0x0568);
var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
var stopping = false;
Console.CancelKeyPress += (_, eventArgs) => { eventArgs.Cancel = true; stopping = true; };

while (!stopping)
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
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            connected = positionAvailable,
            latitude = positionAvailable ? lat : (double?)null,
            longitude = positionAvailable ? lon : (double?)null,
            timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }, jsonOptions));
    }
    catch
    {
        try { if (FSUIPCConnection.IsOpen) FSUIPCConnection.Close(); } catch { }
        Console.WriteLine(JsonSerializer.Serialize(new { connected = false, timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() }, jsonOptions));
    }
    Thread.Sleep(1000);
}

try { if (FSUIPCConnection.IsOpen) FSUIPCConnection.Close(); } catch { }
