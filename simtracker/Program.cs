using System.Text.Json;
using FSUIPC;

var latitude = new Offset<long>(0x0560);
var longitude = new Offset<long>(0x0568);
var groundSpeed = new Offset<uint>(0x02B4);
var verticalSpeed = new Offset<int>(0x02C8);
var onGround = new Offset<ushort>(0x0366);
var heading = new Offset<uint>(0x0580);
var altitude = new Offset<long>(0x0570);
var com1ActiveFrequency = new Offset<uint>(0x05C4);
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
        var headingDegrees = heading.Value / 4294967296d * 360d;
        var altitudeFeet = new FsAltitude(altitude.Value).Feet;
        var groundSpeedKnots = groundSpeed.Value / 65536d * 1.9438444924d;
        var verticalSpeedFeetPerMinute = verticalSpeed.Value / 256d * 196.8503937d;
        double? frequencyMhz = com1ActiveFrequency.Value > 100_000_000
            ? com1ActiveFrequency.Value / 1_000_000d
            : (double?)null;
        Console.WriteLine(JsonSerializer.Serialize(new
        {
            connected = positionAvailable,
            latitude = positionAvailable ? lat : (double?)null,
            longitude = positionAvailable ? lon : (double?)null,
            onGround = onGround.Value != 0,
            groundSpeedKnots = Math.Round(groundSpeedKnots, 1),
            verticalSpeedFeetPerMinute = Math.Round(verticalSpeedFeetPerMinute),
            headingDegrees = Math.Round(headingDegrees, 1),
            altitudeFeet = Math.Round(altitudeFeet),
            com1FrequencyMhz = frequencyMhz.HasValue ? Math.Round(frequencyMhz.Value, 3) : (double?)null,
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
