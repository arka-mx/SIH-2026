import { MapPin, Navigation } from "lucide-react";
import { Card } from "@/components/ui/Card";

export function IncidentMap() {
  return <Card className="map-panel"><div className="flex items-center justify-between"><div><p className="eyebrow">Situation overview</p><h2 className="section-title">Live incident map</h2></div><span className="live-pill"><i /> Live feed</span></div><div className="map-surface"><div className="map-roads" /><div className="map-water" /><span className="map-label label-one">Brahmapur</span><span className="map-label label-two">Gosaninuagaon</span><span className="map-label label-three">Gopalpur</span><div className="map-marker marker-one"><MapPin size={17} /></div><div className="map-marker marker-two"><MapPin size={17} /></div><div className="map-coordinates"><Navigation size={13} /> 19.3151 N, 84.7941 E</div></div></Card>;
}
