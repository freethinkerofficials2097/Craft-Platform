// countries.js - ISO country codes -> country name + continent (used when a GeoNames city file is dropped into data/),
// plus a short block list of ordinary English words that are also (small) town names, so chat words like "nice" or "mobile"
// are never mistaken for a city guess when a big world file is loaded.

const T = `
AF|Afghanistan|AS;AL|Albania|EU;DZ|Algeria|AF;AD|Andorra|EU;AO|Angola|AF;AG|Antigua and Barbuda|NA;AR|Argentina|SA;AM|Armenia|AS;AU|Australia|OC;AT|Austria|EU;AZ|Azerbaijan|AS;
BS|Bahamas|NA;BH|Bahrain|AS;BD|Bangladesh|AS;BB|Barbados|NA;BY|Belarus|EU;BE|Belgium|EU;BZ|Belize|NA;BJ|Benin|AF;BT|Bhutan|AS;BO|Bolivia|SA;BA|Bosnia and Herzegovina|EU;BW|Botswana|AF;BR|Brazil|SA;BN|Brunei|AS;BG|Bulgaria|EU;BF|Burkina Faso|AF;BI|Burundi|AF;
KH|Cambodia|AS;CM|Cameroon|AF;CA|Canada|NA;CV|Cape Verde|AF;CF|Central African Republic|AF;TD|Chad|AF;CL|Chile|SA;CN|China|AS;CO|Colombia|SA;KM|Comoros|AF;CG|Republic of the Congo|AF;CD|DR Congo|AF;CR|Costa Rica|NA;CI|Ivory Coast|AF;HR|Croatia|EU;CU|Cuba|NA;CY|Cyprus|EU;CZ|Czechia|EU;
DK|Denmark|EU;DJ|Djibouti|AF;DM|Dominica|NA;DO|Dominican Republic|NA;EC|Ecuador|SA;EG|Egypt|AF;SV|El Salvador|NA;GQ|Equatorial Guinea|AF;ER|Eritrea|AF;EE|Estonia|EU;SZ|Eswatini|AF;ET|Ethiopia|AF;
FJ|Fiji|OC;FI|Finland|EU;FR|France|EU;GA|Gabon|AF;GM|Gambia|AF;GE|Georgia|AS;DE|Germany|EU;GH|Ghana|AF;GR|Greece|EU;GD|Grenada|NA;GT|Guatemala|NA;GN|Guinea|AF;GW|Guinea-Bissau|AF;GY|Guyana|SA;
HT|Haiti|NA;HN|Honduras|NA;HK|China|AS;HU|Hungary|EU;IS|Iceland|EU;IN|India|AS;ID|Indonesia|AS;IR|Iran|AS;IQ|Iraq|AS;IE|Ireland|EU;IL|Israel|AS;IT|Italy|EU;JM|Jamaica|NA;JP|Japan|AS;JO|Jordan|AS;
KZ|Kazakhstan|AS;KE|Kenya|AF;KI|Kiribati|OC;XK|Kosovo|EU;KW|Kuwait|AS;KG|Kyrgyzstan|AS;LA|Laos|AS;LV|Latvia|EU;LB|Lebanon|AS;LS|Lesotho|AF;LR|Liberia|AF;LY|Libya|AF;LI|Liechtenstein|EU;LT|Lithuania|EU;LU|Luxembourg|EU;
MO|China|AS;MG|Madagascar|AF;MW|Malawi|AF;MY|Malaysia|AS;MV|Maldives|AS;ML|Mali|AF;MT|Malta|EU;MH|Marshall Islands|OC;MR|Mauritania|AF;MU|Mauritius|AF;MX|Mexico|NA;FM|Micronesia|OC;MD|Moldova|EU;MC|Monaco|EU;MN|Mongolia|AS;ME|Montenegro|EU;MA|Morocco|AF;MZ|Mozambique|AF;MM|Myanmar|AS;
NA|Namibia|AF;NR|Nauru|OC;NP|Nepal|AS;NL|Netherlands|EU;NZ|New Zealand|OC;NI|Nicaragua|NA;NE|Niger|AF;NG|Nigeria|AF;KP|North Korea|AS;MK|North Macedonia|EU;NO|Norway|EU;OM|Oman|AS;
PK|Pakistan|AS;PW|Palau|OC;PS|Palestine|AS;PA|Panama|NA;PG|Papua New Guinea|OC;PY|Paraguay|SA;PE|Peru|SA;PH|Philippines|AS;PL|Poland|EU;PT|Portugal|EU;PR|Puerto Rico|NA;QA|Qatar|AS;
RO|Romania|EU;RU|Russia|EU;RW|Rwanda|AF;KN|Saint Kitts and Nevis|NA;LC|Saint Lucia|NA;VC|Saint Vincent and the Grenadines|NA;WS|Samoa|OC;SM|San Marino|EU;ST|Sao Tome and Principe|AF;SA|Saudi Arabia|AS;SN|Senegal|AF;RS|Serbia|EU;SC|Seychelles|AF;SL|Sierra Leone|AF;SG|Singapore|AS;SK|Slovakia|EU;SI|Slovenia|EU;SB|Solomon Islands|OC;SO|Somalia|AF;ZA|South Africa|AF;KR|South Korea|AS;SS|South Sudan|AF;ES|Spain|EU;LK|Sri Lanka|AS;SD|Sudan|AF;SR|Suriname|SA;SE|Sweden|EU;CH|Switzerland|EU;SY|Syria|AS;
TW|Taiwan|AS;TJ|Tajikistan|AS;TZ|Tanzania|AF;TH|Thailand|AS;TL|Timor-Leste|AS;TG|Togo|AF;TO|Tonga|OC;TT|Trinidad and Tobago|NA;TN|Tunisia|AF;TR|Turkey|AS;TM|Turkmenistan|AS;TV|Tuvalu|OC;
UG|Uganda|AF;UA|Ukraine|EU;AE|United Arab Emirates|AS;GB|United Kingdom|EU;US|United States|NA;UY|Uruguay|SA;UZ|Uzbekistan|AS;VU|Vanuatu|OC;VA|Vatican City|EU;VE|Venezuela|SA;VN|Vietnam|AS;YE|Yemen|AS;ZM|Zambia|AF;ZW|Zimbabwe|AF;
GL|Greenland|NA;NC|New Caledonia|OC;PF|French Polynesia|OC;GU|Guam|OC;EH|Western Sahara|AF;FO|Faroe Islands|EU;GI|Gibraltar|EU;IM|Isle of Man|EU;JE|Jersey|EU;GG|Guernsey|EU;BM|Bermuda|NA;KY|Cayman Islands|NA;AW|Aruba|NA;CW|Curacao|NA;RE|Reunion|AF;MQ|Martinique|NA;GP|Guadeloupe|NA;GF|French Guiana|SA;
`;

export const COUNTRY_BY_ISO = {};
for (const part of T.split(/[;\n]/)) {
  const p = part.trim().split("|");
  if (p.length === 3) COUNTRY_BY_ISO[p[0]] = { name: p[1], continent: p[2] };
}

const BLOCK = new Set(("nice mobile reading hull bath orange normal hope free best love cool fun yes okay hello game live like lol wow cute sweet " +
  "happy lucky smart brave great good bad real true false first second third home house school world water earth fire wind rain snow " +
  "king queen prince tiger lion bear wolf eagle small large little big long short high low open close early late quick slow turkey " +
  "chance reno eden paradise bonus fortune liberty union unity center central market spring summer winter autumn sunset sunrise " +
  "welcome thanks thank please sorry hey bye").split(" "));
export function isBlockedCommonWord(key) { return BLOCK.has(key); }
