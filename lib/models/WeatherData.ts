import mongoose, { Schema, Document, Model } from "mongoose";

export interface IWeatherData extends Document {
  temp: number;
  windspeed: number;
  weathercode: number;
  location: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  updated_at: Date;
}

const WeatherDataSchema = new Schema<IWeatherData>(
  {
    temp: { type: Number, required: true },
    windspeed: { type: Number, required: true },
    weathercode: { type: Number, required: true },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], required: true },
    },
    updated_at: { type: Date, default: Date.now },
  }
);

WeatherDataSchema.index({ location: "2dsphere" });

export const WeatherDataModel: Model<IWeatherData> =
  mongoose.models.WeatherData || mongoose.model<IWeatherData>("WeatherData", WeatherDataSchema);
