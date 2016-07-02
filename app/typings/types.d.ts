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