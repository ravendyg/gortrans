
interface iL
{
	polyline: (latlngs: latLng [], polylineOptions?: polylineOptions) => iPolyline;
	circle: (latlng: latLng, radius: number, options?: pathOptions) => iCircle;
	circleMarker: (latlng: latLng, options?: pathOptions) => iCircleMarker;
	latLng: (lat: number, lng: number) => latLng;
	latLngBounds: (southWest: latLng, northEast: latLng) => LatLngBounds;
	map: (id: string, options?: mapOptions) => iMap;
	tileLayer: any;
	marker: (LatLng: latLng, options?: markerOptions) => iMarker;
	icon: (options: iconOptions) => iIcon;
}

interface iMap
{
	setView: (center: latLng, zoom?: number, zpOptions?: zoomPanOptions) => this;
	_container: HTMLDivElement;
	invalidateSize: () => this;
	removeLayer: (layer: iLayer) => this;
	fitBounds: (bounds: LatLngBounds, options?: fitBoundsOptions) => this;
	on: (event: string, cb: (event?: Event) => void) => this;
	off: (event: string, cb: (event?: Event) => void) => this;
	getZoom: () => number;
}

interface iLayer
{
	addTo: (iMap) => this;
	bindLabel: (text: string, options: labelOptions) => this;
	updateLabelContent: () => this;
	showLabel: () => this;
	hideLabel: () => this;
	bindTooltip: (text: string, options: labelOptions) => this;
}

interface iMarker extends iLayer
{
	_icon: { dataset: any };
	bindPopup: (content: string) => this;
	openPopup: () => this;
}

interface iPath extends iLayer
{
	getBounds: () => LatLngBounds;
}

interface iPolyline extends iPath
{

}

interface iCircle extends iPath
{
}

interface iCircleMarker extends iCircle, iMarker
{
}

interface pathOptions
{
	stroke?: boolean,
	color?: string,
	weight?: number,
	opacity?: number,
	fill?: boolean,
	fillOpacity?: number,
	fillRule?: string,
	dashArray?: string,
	lineCap?: string,
	lineJoin?: string,
	clickable?: boolean,
	pointerEvents?: string,
	className?: string,
	radius?: number
}

interface markerOptions
{
	icon?: iIcon;
	clickable?: boolean
}

interface labelOptions
{
	noHide?: boolean;
}

interface iIcon
{

}

declare type iconOptions =
{
	iconUrl?: string,
	iconRetinaUrl?: string,
	iconSize?: Point,
	iconAnchor?: Point,
	labelAnchor?: Point,
	shadowUrl?: string,
	shadowRetinaUrl?: string,
	shadowSize?: Point,
	shadowAnchor?: Point,
	popupAnchor?: Point,
	className?: string
};

interface polylineOptions extends pathOptions
{
	smoothFactor?: number,
	noClip?: boolean
}

declare type zoomPanOptions =
{
	reset?: boolean,
	pan: panOptions,
	zoom: zoomOption,
	animate: boolean
};

declare type panOptions =
{
	animate?: boolean,
	duration?: number,
	easeLinearity?: number,
	noMoveStart?: boolean
};

declare type zoomOption =
{
	animate: boolean
};

declare type LatLngBounds ={
	southWest: latLng,
	nortEast: latLng
};

declare type fitBoundsOptions =
{
	paddingTopLeft: Point,
	paddingBottomRight: Point,
	padding: Point,
	maxZoom: number
};

declare type Point = number [];

interface mapOptions extends mapStateOptions, interactionOptions, keyboardNavigationOptions
{
}

interface mapStateOptions
{
	center?: latLng;
	zoom?: number;
	minZoom?: number;
	maxZoom?: number;
	maxBounds?: LatLngBounds;
}

interface interactionOptions
{

}

interface keyboardNavigationOptions
{

}

interface leafletEvent extends Event
{
	originalEvent:
	{
		target: HTMLElement
	}
}