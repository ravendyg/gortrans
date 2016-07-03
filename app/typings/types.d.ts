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
	lat: string,
	lng: string
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

interface iMap
{
	setView: (center: latLng, zoom?: number, zpOptions?: zoomPanOptions) => iMap;
	_container: HTMLDivElement;
	invalidateSize: () => iMap;
	removeLayer: (layer: iLayer) => iMap;
	fitBounds: (bounds: LatLngBounds, options?: fitBoundsOptions) => iMap;
}

interface iLayer
{

}

interface iPath extends iLayer
{
	getBounds: () => LatLngBounds;
}

interface iPolyline extends iPath
{

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