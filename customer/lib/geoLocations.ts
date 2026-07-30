/**
 * USA states + major cities, Nepal provinces + major cities.
 * Used by searchable region dropdowns on address / checkout forms.
 */

export type GeoRegion = {
  code: string;
  name: string;
  cities: string[];
};

export const COUNTRIES = ['United States', 'Nepal'] as const;
export type SupportedCountry = (typeof COUNTRIES)[number];

export function isSupportedCountry(value: string): value is SupportedCountry {
  return (COUNTRIES as readonly string[]).includes(value);
}

const US: GeoRegion[] = [
  { code: 'AL', name: 'Alabama', cities: ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa'] },
  { code: 'AK', name: 'Alaska', cities: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Wasilla'] },
  { code: 'AZ', name: 'Arizona', cities: ['Phoenix', 'Tucson', 'Mesa', 'Chandler', 'Scottsdale', 'Flagstaff'] },
  { code: 'AR', name: 'Arkansas', cities: ['Little Rock', 'Fayetteville', 'Fort Smith', 'Springdale', 'Jonesboro'] },
  {
    code: 'CA',
    name: 'California',
    cities: [
      'Los Angeles',
      'San Francisco',
      'San Diego',
      'San Jose',
      'Sacramento',
      'Oakland',
      'Fresno',
      'Long Beach',
      'Pasadena',
      'Irvine',
      'Berkeley',
      'Santa Monica',
    ],
  },
  { code: 'CO', name: 'Colorado', cities: ['Denver', 'Colorado Springs', 'Aurora', 'Boulder', 'Fort Collins'] },
  { code: 'CT', name: 'Connecticut', cities: ['Bridgeport', 'New Haven', 'Hartford', 'Stamford', 'Waterbury'] },
  { code: 'DE', name: 'Delaware', cities: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Bear'] },
  { code: 'DC', name: 'District of Columbia', cities: ['Washington'] },
  {
    code: 'FL',
    name: 'Florida',
    cities: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'Tallahassee', 'St. Petersburg'],
  },
  { code: 'GA', name: 'Georgia', cities: ['Atlanta', 'Savannah', 'Augusta', 'Athens', 'Columbus', 'Macon'] },
  { code: 'HI', name: 'Hawaii', cities: ['Honolulu', 'Hilo', 'Kailua', 'Kapolei', 'Kahului'] },
  { code: 'ID', name: 'Idaho', cities: ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello'] },
  {
    code: 'IL',
    name: 'Illinois',
    cities: ['Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 'Springfield', 'Evanston'],
  },
  { code: 'IN', name: 'Indiana', cities: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Bloomington'] },
  { code: 'IA', name: 'Iowa', cities: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Iowa City', 'Sioux City'] },
  { code: 'KS', name: 'Kansas', cities: ['Wichita', 'Overland Park', 'Kansas City', 'Topeka', 'Lawrence'] },
  { code: 'KY', name: 'Kentucky', cities: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington'] },
  { code: 'LA', name: 'Louisiana', cities: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles'] },
  { code: 'ME', name: 'Maine', cities: ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn'] },
  { code: 'MD', name: 'Maryland', cities: ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Annapolis'] },
  {
    code: 'MA',
    name: 'Massachusetts',
    cities: ['Boston', 'Cambridge', 'Worcester', 'Springfield', 'Lowell', 'Somerville'],
  },
  { code: 'MI', name: 'Michigan', cities: ['Detroit', 'Grand Rapids', 'Ann Arbor', 'Lansing', 'Warren', 'Flint'] },
  {
    code: 'MN',
    name: 'Minnesota',
    cities: ['Minneapolis', 'Saint Paul', 'Rochester', 'Duluth', 'Bloomington', 'Brooklyn Park'],
  },
  { code: 'MS', name: 'Mississippi', cities: ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi'] },
  { code: 'MO', name: 'Missouri', cities: ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence'] },
  { code: 'MT', name: 'Montana', cities: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Helena'] },
  { code: 'NE', name: 'Nebraska', cities: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney'] },
  { code: 'NV', name: 'Nevada', cities: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks', 'Carson City'] },
  { code: 'NH', name: 'New Hampshire', cities: ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover'] },
  {
    code: 'NJ',
    name: 'New Jersey',
    cities: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Trenton', 'Princeton', 'Hoboken'],
  },
  { code: 'NM', name: 'New Mexico', cities: ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell'] },
  {
    code: 'NY',
    name: 'New York',
    cities: [
      'New York City',
      'Buffalo',
      'Rochester',
      'Yonkers',
      'Syracuse',
      'Albany',
      'Ithaca',
      'Brooklyn',
      'Queens',
      'Manhattan',
    ],
  },
  {
    code: 'NC',
    name: 'North Carolina',
    cities: ['Charlotte', 'Raleigh', 'Durham', 'Greensboro', 'Winston-Salem', 'Asheville', 'Wilmington'],
  },
  { code: 'ND', name: 'North Dakota', cities: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo'] },
  {
    code: 'OH',
    name: 'Ohio',
    cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton'],
  },
  { code: 'OK', name: 'Oklahoma', cities: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Edmond'] },
  { code: 'OR', name: 'Oregon', cities: ['Portland', 'Eugene', 'Salem', 'Gresham', 'Bend', 'Beaverton'] },
  {
    code: 'PA',
    name: 'Pennsylvania',
    cities: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading', 'Harrisburg', 'Scranton'],
  },
  { code: 'RI', name: 'Rhode Island', cities: ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'Newport'] },
  {
    code: 'SC',
    name: 'South Carolina',
    cities: ['Charleston', 'Columbia', 'Greenville', 'Myrtle Beach', 'Spartanburg', 'Rock Hill'],
  },
  { code: 'SD', name: 'South Dakota', cities: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown'] },
  {
    code: 'TN',
    name: 'Tennessee',
    cities: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville', 'Murfreesboro'],
  },
  {
    code: 'TX',
    name: 'Texas',
    cities: [
      'Houston',
      'Dallas',
      'Austin',
      'San Antonio',
      'Fort Worth',
      'El Paso',
      'Arlington',
      'Plano',
      'Irving',
    ],
  },
  { code: 'UT', name: 'Utah', cities: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Park City'] },
  { code: 'VT', name: 'Vermont', cities: ['Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier'] },
  {
    code: 'VA',
    name: 'Virginia',
    cities: ['Virginia Beach', 'Norfolk', 'Richmond', 'Arlington', 'Alexandria', 'Roanoke', 'Charlottesville'],
  },
  {
    code: 'WA',
    name: 'Washington',
    cities: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Olympia', 'Redmond'],
  },
  { code: 'WV', name: 'West Virginia', cities: ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling'] },
  {
    code: 'WI',
    name: 'Wisconsin',
    cities: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine', 'Appleton'],
  },
  { code: 'WY', name: 'Wyoming', cities: ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs'] },
];

const NEPAL: GeoRegion[] = [
  {
    code: 'KOSHI',
    name: 'Koshi',
    cities: ['Biratnagar', 'Dharan', 'Itahari', 'Damak', 'Birtamod', 'Dhankuta', 'Ilam', 'Inaruwa'],
  },
  {
    code: 'MADHESH',
    name: 'Madhesh',
    cities: ['Janakpur', 'Birgunj', 'Kalaiya', 'Jitpur Simara', 'Rajbiraj', 'Lahan', 'Gaur', 'Malangwa'],
  },
  {
    code: 'BAGMATI',
    name: 'Bagmati',
    cities: [
      'Kathmandu',
      'Lalitpur',
      'Bhaktapur',
      'Kirtipur',
      'Madhyapur Thimi',
      'Hetauda',
      'Banepa',
      'Dhulikhel',
      'Bharatpur',
      'Chitwan',
    ],
  },
  {
    code: 'GANDAKI',
    name: 'Gandaki',
    cities: ['Pokhara', 'Byas', 'Putalibazar', 'Waling', 'Gorkha', 'Baglung', 'Besisahar', 'Kusma'],
  },
  {
    code: 'LUMBINI',
    name: 'Lumbini',
    cities: ['Butwal', 'Siddharthanagar', 'Nepalgunj', 'Tulsipur', 'Ghorahi', 'Kapilvastu', 'Tansen', 'Lamahi'],
  },
  {
    code: 'KARNALI',
    name: 'Karnali',
    cities: ['Birendranagar', 'Dullu', 'Chandannath', 'Musikot', 'Nagma', 'Jumla'],
  },
  {
    code: 'SUDURPASHCHIM',
    name: 'Sudurpashchim',
    cities: ['Dhangadhi', 'Mahendranagar', 'Tikapur', 'Attariya', 'Dipayal Silgadhi', 'Amargadhi'],
  },
];

export function getRegionsForCountry(country: string): GeoRegion[] {
  if (country === 'Nepal') return NEPAL;
  return US;
}

export function getRegionByName(country: string, stateOrProvince: string): GeoRegion | undefined {
  const needle = stateOrProvince.trim().toLowerCase();
  return getRegionsForCountry(country).find(
    (r) => r.name.toLowerCase() === needle || r.code.toLowerCase() === needle,
  );
}

export function getCitiesForRegion(country: string, stateOrProvince: string): string[] {
  return getRegionByName(country, stateOrProvince)?.cities ?? [];
}

export function stateOptions(country: string): { value: string; label: string }[] {
  return getRegionsForCountry(country).map((r) => ({
    value: r.name,
    label: country === 'United States' ? `${r.name} (${r.code})` : r.name,
  }));
}

export function cityOptions(country: string, stateOrProvince: string): { value: string; label: string }[] {
  return getCitiesForRegion(country, stateOrProvince).map((c) => ({ value: c, label: c }));
}
