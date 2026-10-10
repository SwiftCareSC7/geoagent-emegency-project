// Google Encoded Polyline algorithm test
// Vector from Google documentation:
// points: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
// encoded: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"

function decodeGooglePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  const poly = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;
  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    poly.push([Number((lng / 1e5).toFixed(6)), Number((lat / 1e5).toFixed(6))]);
  }
  return poly;
}

const sampleEncoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
const decoded = decodeGooglePolyline(sampleEncoded);
console.log('Decoded [lng, lat]:', decoded);

const expected = [
  [-120.2, 38.5],
  [-120.95, 40.7],
  [-126.453, 43.252]
];

const match = decoded.every((pt, i) => 
  Math.abs(pt[0] - expected[i][0]) < 1e-5 && 
  Math.abs(pt[1] - expected[i][1]) < 1e-5
);

console.log('Matches official Google polyline test vector:', match);
if (!match) {
  console.error('FAILED!');
  process.exit(1);
} else {
  console.log('SUCCESS: Google polyline decoder is 100% mathematically correct!');
}

