import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { WeatherDataModel } from "@/lib/models/WeatherData";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: "Missing lat/lng query parameters" }, { status: 400 });
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "Invalid lat/lng coordinates" }, { status: 400 });
    }

    await connectToDatabase();

    // Check for cached weather within 2km updated in the last 30 minutes
    const cachedWeather = await WeatherDataModel.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: 2000, // 2000 meters (2 km)
        },
      },
      updated_at: { $gt: new Date(Date.now() - 30 * 60 * 1000) } // last 30 mins
    });

    if (cachedWeather) {
      return NextResponse.json({
        temp: cachedWeather.temp,
        windspeed: cachedWeather.windspeed,
        weathercode: cachedWeather.weathercode,
        cached: true
      });
    }

    // Cache miss: Fetch from free, keyless Open-Meteo API
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
    );

    if (!response.ok) {
      throw new Error(`Open-Meteo API error status: ${response.status}`);
    }

    const data = await response.json();
    const current = data.current_weather;

    if (!current) {
      throw new Error("No current weather data in Open-Meteo response");
    }

    const temp = current.temperature;
    const windspeed = current.windspeed;
    const weathercode = current.weathercode;

    // Save to cache
    await WeatherDataModel.create({
      temp,
      windspeed,
      weathercode,
      location: { type: "Point", coordinates: [lng, lat] },
      updated_at: new Date()
    });

    return NextResponse.json({
      temp,
      windspeed,
      weathercode,
      cached: false
    });
  } catch (err: any) {
    console.error("Weather fetch failed:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch weather" }, { status: 500 });
  }
}
