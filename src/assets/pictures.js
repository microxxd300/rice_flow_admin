// The admin's pictures (cut from the ChatGPT sheets), by the keys the pages already use.
import soil_ph from './factors/soil_ph.png';
import soil_texture from './factors/soil_texture.png';
import organic_matter from './factors/organic_matter.png';
import drainage from './factors/drainage.png';
import avg_temperature from './factors/avg_temperature.png';
import seasonal_rainfall from './factors/seasonal_rainfall.png';
import humidity from './factors/humidity.png';
import solar_radiation from './factors/solar_radiation.png';
import temp_at_flowering from './factors/temp_at_flowering.png';
import elevation from './factors/elevation.png';
import slope from './factors/slope.png';
import stress_tolerance from './factors/stress_tolerance.png';
import irrigated_lowland from './ecosystems/irrigated_lowland.png';
import rainfed_lowland from './ecosystems/rainfed_lowland.png';
import upland from './ecosystems/upland.png';
import import_done from './empty/import_done.png';
import import_failed from './empty/import_failed.png';

const FACTORS = {
  soil_ph, soil_texture, organic_matter, drainage, avg_temperature, seasonal_rainfall,
  humidity, solar_radiation, temp_at_flowering, elevation, slope, stress_tolerance,
};
const ECOSYSTEMS = { irrigated_lowland, rainfed_lowland, upland };
const EMPTY = { import_done, import_failed };

/** A Suitability Rules factor (its key) → its icon, or null. */
export const factorPic = key => FACTORS[key] ?? null;
/** An ecosystem value (irrigated_lowland, rainfed_lowland, upland) → its picture, or null. */
export const ecosystemPic = value => ECOSYSTEMS[String(value || '').toLowerCase().replace(/ /g, '_')] ?? null;
/** An import result (import_done, import_failed) → its picture, or null. */
export const emptyPic = name => EMPTY[name] ?? null;
