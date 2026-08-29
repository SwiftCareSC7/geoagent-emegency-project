export function getNewRoute(currentLocation, destination) {
  return {
    routes: [
      {
        name: "Route A",
        etaMinutes: 16,
        traffic: "Heavy"
      },
      {
        name: "Route B",
        etaMinutes: 11,
        traffic: "Moderate"
      },
      {
        name: "Route C",
        etaMinutes: 14,
        traffic: "Medium"
      }
    ]
  };
} 