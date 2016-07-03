declare type routeType =
{
	marsh: string,
	name: string,
	stopb: string,
	stope: string
};

declare type routesType =
{
	buses: routeType [],
	smallBuses: routeType [],
	trams: routeType [],
	trolleys: routeType []
};

declare type marshListResponse =
{
	type: number,
	ways: routeType []
};

declare type trassPoint =
{
	id?: string,
	n?: string,
	len?: string,
	lat: number,
	lng: number
};

declare type trassPointsResponse =
{
	trasses:
	{
		r:
		{
			pc: string,
			marsh: string,
			u: trassPoint []
		} []
	} []
};

declare type latLng =
{
	lat: number,
	lng: number,
	alt?: number
};

declare type actualRoute =
{
	[id: string]:
	{
		route: iPolyline,
		stops:
		{
			id: string,
			marker: iCircle
		} []
	}
};

interface iL
{
	polyline: (latlngs: latLng [], polylineOptions?: polylineOptions) => iPolyline;
	circle: (latlng: latLng, radius: number, options?: pathOptions) => iCircle;
	circleMarker: (latlng: latLng, options?: pathOptions) => iCircleMarker;
	latLng: (lat: number, lng: number) => latLng;
	latLngBounds: (southWest: latLng, northEast: latLng) => LatLngBounds;
	map: (id: string, options?: mapOptions) => iMap;
	tileLayer: any;
}

interface iMap
{
	setView: (center: latLng, zoom?: number, zpOptions?: zoomPanOptions) => this;
	_container: HTMLDivElement;
	invalidateSize: () => this;
	removeLayer: (layer: iLayer) => this;
	fitBounds: (bounds: LatLngBounds, options?: fitBoundsOptions) => this;
}

interface iLayer
{
}

interface iMarker
{
	bindPopup: (content: string) => this;
	openPopup: () => this;
}

interface iPath extends iLayer
{
	getBounds: () => LatLngBounds;
	addTo: (iMap) => this;
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

declare type Point =
{
	x: number,
	y: number,
	round?: boolean
};

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