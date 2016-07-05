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
		} [],
		color: string
	}
};

declare type busData =
{
	title: string,
	idTypetr: string,
	marsh: string,
	graph: number,
	direction: string,
	lat: number,
	lng: number,
	time_nav: number,
	azimuth: number,
	rasp: string,
	speed: number,
	segmentOrder: string,
	ramp: string
};

declare type busDataResponse =
{
	title: string,
	id_typetr: string,
	marsh: string,
	graph: string,
	direction: string,
	lat: string,
	lng: string,
	time_nav: string,
	azimuth: string,
	rasp: string,
	speed: string,
	segment_order: string,
	ramp: string
};

declare type busIcon =
{
	id: string,
	img: string,
	color: string,
	name: string
};