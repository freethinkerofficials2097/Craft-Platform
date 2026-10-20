// cities-data.js - the CITYDLE city list (update 94).
// One line per country (a country that spans two continents has two lines):  Country | continent | city lat lon tier [=aliases] ; ...
//   continent: EU Europe, AS Asia, AF Africa, NA North America, SA South America, OC Oceania
//   tier: 1 = world-famous, 2 = well known, 3 = lesser known (the host's Difficulty setting picks from the tiers)
// Names are plain English / ASCII on purpose: chat players type "sao paulo" or "São Paulo" and both match (accents are stripped).
// Add a city by adding "Name lat lon tier" to its country's line (keep the numbers in that order).

export const CITY_DATA = `
United Kingdom|EU|London 51.51 -0.13 1;Manchester 53.48 -2.24 2;Birmingham 52.49 -1.89 2;Liverpool 53.41 -2.98 2;Edinburgh 55.95 -3.19 2;Glasgow 55.86 -4.25 2;Leeds 53.80 -1.55 3;Bristol 51.45 -2.59 3;Sheffield 53.38 -1.47 3;Newcastle 54.98 -1.62 3;Cardiff 51.48 -3.18 3;Belfast 54.60 -5.93 3;Nottingham 52.95 -1.15 3;Aberdeen 57.15 -2.09 3;Oxford 51.75 -1.26 3;Cambridge 52.21 0.12 3
France|EU|Paris 48.86 2.35 1;Marseille 43.30 5.37 2;Lyon 45.76 4.84 2;Toulouse 43.60 1.44 3;Bordeaux 44.84 -0.58 3;Lille 50.63 3.06 3;Strasbourg 48.57 7.75 3;Nantes 47.22 -1.55 3;Montpellier 43.61 3.88 3;Cannes 43.55 7.02 3
Germany|EU|Berlin 52.52 13.40 1;Munich 48.14 11.58 1=Munchen;Hamburg 53.55 9.99 2;Frankfurt 50.11 8.68 2;Cologne 50.94 6.96 2=Koln;Stuttgart 48.78 9.18 3;Dusseldorf 51.23 6.78 3;Dortmund 51.51 7.47 3;Leipzig 51.34 12.37 3;Dresden 51.05 13.74 3;Hanover 52.37 9.73 3=Hannover;Nuremberg 49.45 11.08 3=Nurnberg;Bremen 53.08 8.80 3
Italy|EU|Rome 41.90 12.50 1=Roma;Milan 45.46 9.19 1=Milano;Venice 45.44 12.32 2=Venezia;Florence 43.77 11.26 2=Firenze;Naples 40.85 14.27 2=Napoli;Turin 45.07 7.69 3=Torino;Bologna 44.49 11.34 3;Genoa 44.41 8.93 3=Genova;Palermo 38.12 13.36 3;Verona 45.44 10.99 3;Pisa 43.72 10.40 3
Spain|EU|Madrid 40.42 -3.70 1;Barcelona 41.39 2.17 1;Valencia 39.47 -0.38 2;Seville 37.39 -5.98 2=Sevilla;Malaga 36.72 -4.42 3;Bilbao 43.26 -2.93 3;Zaragoza 41.65 -0.89 3;Granada 37.18 -3.60 3;Palma 39.57 2.65 3
Portugal|EU|Lisbon 38.72 -9.14 1=Lisboa;Porto 41.15 -8.61 2;Faro 37.02 -7.93 3
Netherlands|EU|Amsterdam 52.37 4.90 1;Rotterdam 51.92 4.48 2;The Hague 52.08 4.30 3=Den Haag;Utrecht 52.09 5.12 3;Eindhoven 51.44 5.48 3
Belgium|EU|Brussels 50.85 4.35 2;Antwerp 51.22 4.40 3;Bruges 51.21 3.22 3;Ghent 51.05 3.72 3
Switzerland|EU|Zurich 47.38 8.54 2;Geneva 46.20 6.14 2;Bern 46.95 7.45 3;Basel 47.56 7.59 3;Lausanne 46.52 6.63 3
Austria|EU|Vienna 48.21 16.37 1=Wien;Salzburg 47.80 13.04 3;Innsbruck 47.27 11.39 3;Graz 47.07 15.44 3
Czechia|EU|Prague 50.08 14.44 1=Praha;Brno 49.20 16.61 3
Poland|EU|Warsaw 52.23 21.01 2=Warszawa;Krakow 50.06 19.94 2;Gdansk 54.35 18.65 3;Wroclaw 51.11 17.04 3;Poznan 52.41 16.93 3;Lodz 51.76 19.46 3
Hungary|EU|Budapest 47.50 19.04 1;Debrecen 47.53 21.63 3
Romania|EU|Bucharest 44.43 26.10 2;Cluj-Napoca 46.77 23.59 3=Cluj;Timisoara 45.75 21.23 3;Brasov 45.65 25.61 3
Bulgaria|EU|Sofia 42.70 23.32 2;Plovdiv 42.14 24.75 3;Varna 43.21 27.91 3
Greece|EU|Athens 37.98 23.73 1;Thessaloniki 40.64 22.94 3;Patras 38.25 21.73 3;Heraklion 35.34 25.13 3
Croatia|EU|Zagreb 45.81 15.98 3;Dubrovnik 42.65 18.09 3
Serbia|EU|Belgrade 44.79 20.45 2;Novi Sad 45.26 19.83 3
Bosnia and Herzegovina|EU|Sarajevo 43.86 18.41 3
Slovenia|EU|Ljubljana 46.06 14.51 3
Slovakia|EU|Bratislava 48.15 17.11 3
Denmark|EU|Copenhagen 55.68 12.57 1;Aarhus 56.16 10.20 3
Sweden|EU|Stockholm 59.33 18.07 1;Gothenburg 57.71 11.97 3;Malmo 55.60 13.00 3
Norway|EU|Oslo 59.91 10.75 2;Bergen 60.39 5.32 3;Trondheim 63.43 10.40 3
Finland|EU|Helsinki 60.17 24.94 2;Tampere 61.50 23.76 3
Iceland|EU|Reykjavik 64.15 -21.94 3
Ireland|EU|Dublin 53.35 -6.26 1;Cork 51.90 -8.47 3;Galway 53.27 -9.05 3
Estonia|EU|Tallinn 59.44 24.75 3
Latvia|EU|Riga 56.95 24.11 3
Lithuania|EU|Vilnius 54.69 25.28 3
Ukraine|EU|Kyiv 50.45 30.52 2=Kiev;Odesa 46.48 30.73 3=Odessa;Kharkiv 49.99 36.23 3=Kharkov;Lviv 49.84 24.03 3
Belarus|EU|Minsk 53.90 27.57 3
Russia|EU|Moscow 55.76 37.62 1;Saint Petersburg 59.93 30.34 1=St Petersburg;Kazan 55.80 49.11 3;Sochi 43.60 39.73 3;Volgograd 48.71 44.51 3;Nizhny Novgorod 56.33 44.00 3
Russia|AS|Novosibirsk 55.03 82.92 3;Vladivostok 43.12 131.89 3;Yekaterinburg 56.84 60.60 3
Albania|EU|Tirana 41.33 19.82 3
North Macedonia|EU|Skopje 41.99 21.43 3
Montenegro|EU|Podgorica 42.44 19.26 3
Moldova|EU|Chisinau 47.01 28.86 3
Luxembourg|EU|Luxembourg 49.61 6.13 3
Malta|EU|Valletta 35.90 14.51 3
Turkey|AS|Istanbul 41.01 28.98 1;Ankara 39.93 32.86 2;Izmir 38.42 27.14 3;Antalya 36.90 30.71 3;Bursa 40.18 29.06 3
China|AS|Beijing 39.90 116.41 1=Peking;Shanghai 31.23 121.47 1;Guangzhou 23.13 113.26 2=Canton;Shenzhen 22.54 114.06 2;Chengdu 30.57 104.07 2;Hong Kong 22.32 114.17 1;Hangzhou 30.27 120.16 3;Wuhan 30.59 114.31 3;Xian 34.34 108.94 3;Chongqing 29.56 106.55 3;Nanjing 32.06 118.80 3;Tianjin 39.34 117.36 3;Harbin 45.80 126.53 3;Kunming 25.04 102.71 3;Qingdao 36.07 120.38 3;Suzhou 31.30 120.59 3;Macau 22.20 113.55 3
Japan|AS|Tokyo 35.68 139.69 1;Osaka 34.69 135.50 1;Kyoto 35.01 135.77 2;Yokohama 35.44 139.64 3;Nagoya 35.18 136.91 3;Sapporo 43.06 141.35 3;Fukuoka 33.59 130.40 3;Kobe 34.69 135.20 3;Hiroshima 34.39 132.46 3;Nara 34.69 135.80 3;Sendai 38.27 140.87 3;Nagasaki 32.75 129.88 3
South Korea|AS|Seoul 37.57 126.98 1;Busan 35.18 129.08 2;Incheon 37.46 126.71 3;Daegu 35.87 128.60 3;Jeju 33.50 126.53 3
North Korea|AS|Pyongyang 39.04 125.76 3
Taiwan|AS|Taipei 25.03 121.57 2;Kaohsiung 22.63 120.30 3;Taichung 24.15 120.67 3
Mongolia|AS|Ulaanbaatar 47.89 106.91 3
India|AS|Delhi 28.61 77.21 1=New Delhi;Mumbai 19.08 72.88 1=Bombay;Bangalore 12.97 77.59 2=Bengaluru;Kolkata 22.57 88.36 2=Calcutta;Chennai 13.08 80.27 2=Madras;Hyderabad 17.39 78.49 2;Ahmedabad 23.02 72.57 3;Pune 18.52 73.86 3;Jaipur 26.91 75.79 3;Lucknow 26.85 80.95 3;Agra 27.18 78.02 3;Varanasi 25.32 83.01 3;Goa 15.50 73.83 3;Kochi 9.93 76.27 3;Surat 21.17 72.83 3;Amritsar 31.63 74.87 3;Chandigarh 30.73 76.78 3
Pakistan|AS|Karachi 24.86 67.01 2;Lahore 31.55 74.34 2;Islamabad 33.69 73.05 2;Rawalpindi 33.60 73.05 3;Peshawar 34.02 71.58 3
Bangladesh|AS|Dhaka 23.81 90.41 2;Chittagong 22.36 91.78 3
Nepal|AS|Kathmandu 27.72 85.32 3
Sri Lanka|AS|Colombo 6.93 79.86 3
Bhutan|AS|Thimphu 27.47 89.64 3
Afghanistan|AS|Kabul 34.53 69.17 3
Iran|AS|Tehran 35.69 51.39 2;Isfahan 32.65 51.67 3;Shiraz 29.59 52.58 3;Mashhad 36.30 59.61 3;Tabriz 38.08 46.29 3
Iraq|AS|Baghdad 33.31 44.37 2;Basra 30.51 47.78 3;Erbil 36.19 44.01 3;Mosul 36.34 43.13 3
Syria|AS|Damascus 33.51 36.28 3;Aleppo 36.20 37.16 3
Lebanon|AS|Beirut 33.89 35.50 2
Jordan|AS|Amman 31.95 35.93 2
Israel|AS|Jerusalem 31.77 35.21 2;Tel Aviv 32.09 34.78 2;Haifa 32.79 34.99 3
Saudi Arabia|AS|Riyadh 24.71 46.68 2;Jeddah 21.49 39.19 2;Mecca 21.39 39.86 2;Medina 24.47 39.61 3;Dammam 26.43 50.10 3
United Arab Emirates|AS|Dubai 25.20 55.27 1;Abu Dhabi 24.45 54.38 2;Sharjah 25.35 55.42 3
Qatar|AS|Doha 25.29 51.53 2
Kuwait|AS|Kuwait City 29.38 47.99 3
Bahrain|AS|Manama 26.23 50.59 3
Oman|AS|Muscat 23.59 58.41 3
Yemen|AS|Sanaa 15.37 44.19 3
Georgia|AS|Tbilisi 41.72 44.79 3
Armenia|AS|Yerevan 40.18 44.51 3
Azerbaijan|AS|Baku 40.41 49.87 3
Kazakhstan|AS|Astana 51.17 71.43 3;Almaty 43.24 76.89 3
Uzbekistan|AS|Tashkent 41.30 69.24 3;Samarkand 39.65 66.96 3
Kyrgyzstan|AS|Bishkek 42.87 74.59 3
Turkmenistan|AS|Ashgabat 37.96 58.33 3
Tajikistan|AS|Dushanbe 38.56 68.77 3
Thailand|AS|Bangkok 13.76 100.50 1;Phuket 7.88 98.39 2;Chiang Mai 18.79 98.98 2;Pattaya 12.93 100.88 3
Vietnam|AS|Hanoi 21.03 105.85 2;Ho Chi Minh City 10.82 106.63 2=Saigon,HCMC;Da Nang 16.05 108.20 3;Hue 16.46 107.59 3;Hai Phong 20.84 106.69 3
Cambodia|AS|Phnom Penh 11.56 104.93 3;Siem Reap 13.37 103.86 3
Laos|AS|Vientiane 17.97 102.63 3
Myanmar|AS|Yangon 16.87 96.20 3=Rangoon;Naypyidaw 19.76 96.08 3;Mandalay 21.98 96.08 3
Malaysia|AS|Kuala Lumpur 3.14 101.69 1=KL;Penang 5.42 100.33 3;Johor Bahru 1.49 103.74 3=JB;Kota Kinabalu 5.98 116.07 3;Kuching 1.55 110.34 3;Malacca 2.20 102.25 3=Melaka;Ipoh 4.60 101.08 3;Putrajaya 2.93 101.69 3;Shah Alam 3.07 101.52 3;Petaling Jaya 3.10 101.61 3=PJ;Langkawi 6.35 99.80 3;Kuantan 3.81 103.33 3;Alor Setar 6.12 100.37 3;Kota Bharu 6.13 102.24 3;Seremban 2.73 101.94 3;Miri 4.40 113.99 3;Sandakan 5.84 118.12 3
Singapore|AS|Singapore 1.35 103.82 1
Brunei|AS|Bandar Seri Begawan 4.89 114.94 3
Indonesia|AS|Jakarta 6.21 106.85 1;Surabaya -7.25 112.75 2;Bandung -6.92 107.61 2;Denpasar -8.65 115.22 3;Medan 3.59 98.67 3;Yogyakarta -7.80 110.37 3;Semarang -6.97 110.42 3;Makassar -5.15 119.43 3;Palembang -2.98 104.76 3;Batam 1.05 104.03 3;Balikpapan -1.24 116.83 3;Manado 1.47 124.84 3
Philippines|AS|Manila 14.60 120.98 1;Cebu 10.32 123.89 3;Davao 7.19 125.46 3;Quezon City 14.68 121.04 3
Timor-Leste|AS|Dili -8.56 125.57 3
Egypt|AF|Cairo 30.04 31.24 1;Alexandria 31.20 29.92 2;Giza 30.01 31.21 3;Luxor 25.69 32.64 3;Aswan 24.09 32.90 3;Sharm El Sheikh 27.92 34.33 3
Morocco|AF|Casablanca 33.57 -7.59 2;Marrakech 31.63 -8.01 2;Rabat 34.02 -6.84 3;Fez 34.03 -5.00 3;Tangier 35.77 -5.80 3
Algeria|AF|Algiers 36.75 3.06 3;Oran 35.70 -0.63 3
Tunisia|AF|Tunis 36.81 10.18 3
Libya|AF|Tripoli 32.89 13.19 3
Nigeria|AF|Lagos 6.52 3.38 1;Abuja 9.08 7.40 2;Kano 12.00 8.52 3;Ibadan 7.38 3.95 3;Port Harcourt 4.82 7.05 3
Ghana|AF|Accra 5.60 -0.19 2;Kumasi 6.69 -1.62 3
Ivory Coast|AF|Abidjan 5.36 -4.01 3;Yamoussoukro 6.83 -5.28 3
Senegal|AF|Dakar 14.72 -17.47 3
Mali|AF|Bamako 12.64 -8.00 3
Guinea|AF|Conakry 9.64 -13.58 3
Sierra Leone|AF|Freetown 8.48 -13.23 3
Liberia|AF|Monrovia 6.30 -10.80 3
Burkina Faso|AF|Ouagadougou 12.37 -1.52 3
Niger|AF|Niamey 13.51 2.11 3
Cameroon|AF|Douala 4.05 9.77 3;Yaounde 3.85 11.50 3
Gabon|AF|Libreville 0.42 9.47 3
DR Congo|AF|Kinshasa -4.44 15.27 2;Lubumbashi -11.66 27.48 3
Republic of the Congo|AF|Brazzaville -4.27 15.28 3
Angola|AF|Luanda -8.84 13.23 3
Chad|AF|Ndjamena 12.13 15.06 3
Sudan|AF|Khartoum 15.50 32.56 3
South Sudan|AF|Juba 4.85 31.58 3
Ethiopia|AF|Addis Ababa 9.03 38.74 2
Eritrea|AF|Asmara 15.32 38.93 3
Somalia|AF|Mogadishu 2.05 45.32 3
Djibouti|AF|Djibouti 11.59 43.15 3
Kenya|AF|Nairobi -1.29 36.82 1;Mombasa -4.04 39.67 3
Uganda|AF|Kampala 0.35 32.58 3
Tanzania|AF|Dar es Salaam -6.79 39.21 2;Dodoma -6.16 35.75 3;Zanzibar -6.16 39.20 3
Rwanda|AF|Kigali -1.95 30.06 3
Burundi|AF|Bujumbura -3.38 29.36 3
Zambia|AF|Lusaka -15.39 28.32 3
Zimbabwe|AF|Harare -17.83 31.05 3
Malawi|AF|Lilongwe -13.98 33.78 3
Mozambique|AF|Maputo -25.97 32.57 3
Namibia|AF|Windhoek -22.56 17.08 3
Botswana|AF|Gaborone -24.63 25.92 3
Madagascar|AF|Antananarivo -18.88 47.51 3
Mauritius|AF|Port Louis -20.16 57.50 3
South Africa|AF|Johannesburg -26.20 28.05 1;Cape Town -33.92 18.42 1;Durban -29.86 31.02 2;Pretoria -25.75 28.19 2;Port Elizabeth -33.96 25.60 3=Gqeberha;Bloemfontein -29.12 26.21 3
United States|NA|New York 40.71 -74.01 1=New York City,NYC;Los Angeles 34.05 -118.24 1;Chicago 41.88 -87.63 1;San Francisco 37.77 -122.42 1;Seattle 47.61 -122.33 1;Washington DC 38.91 -77.04 1=Washington;Las Vegas 36.17 -115.14 1;Miami 25.76 -80.19 1;Houston 29.76 -95.37 2;Phoenix 33.45 -112.07 2;Philadelphia 39.95 -75.17 2;San Diego 32.72 -117.16 2;Dallas 32.78 -96.80 2;Denver 39.74 -104.99 2;Boston 42.36 -71.06 2;Atlanta 33.75 -84.39 2;Detroit 42.33 -83.05 2;Orlando 28.54 -81.38 2;New Orleans 29.95 -90.07 2;Honolulu 21.31 -157.86 2;San Antonio 29.42 -98.49 3;Austin 30.27 -97.74 3;Jacksonville 30.33 -81.66 3;Minneapolis 44.98 -93.27 3;Portland 45.52 -122.68 3;Nashville 36.16 -86.78 3;Memphis 35.15 -90.05 3;Baltimore 39.29 -76.61 3;Pittsburgh 40.44 -80.00 3;Cleveland 41.50 -81.69 3;St Louis 38.63 -90.20 3=Saint Louis;Kansas City 39.10 -94.58 3;Salt Lake City 40.76 -111.89 3;Anchorage 61.22 -149.90 3;Charlotte 35.23 -80.84 3;Tampa 27.95 -82.46 3;Cincinnati 39.10 -84.51 3;Raleigh 35.78 -78.64 3;Milwaukee 43.04 -87.91 3;Indianapolis 39.77 -86.16 3;Columbus 39.96 -83.00 3;Sacramento 38.58 -121.49 3;Albuquerque 35.08 -106.65 3;El Paso 31.76 -106.49 3;Oklahoma City 35.47 -97.52 3;Tucson 32.22 -110.97 3;Fort Worth 32.76 -97.33 3;Buffalo 42.89 -78.88 3;Savannah 32.08 -81.09 3;Louisville 38.25 -85.76 3;Boise 43.62 -116.20 3
Canada|NA|Toronto 43.65 -79.38 1;Vancouver 49.28 -123.12 1;Montreal 45.50 -73.57 1;Ottawa 45.42 -75.70 2;Calgary 51.05 -114.07 2;Edmonton 53.55 -113.49 3;Winnipeg 49.90 -97.14 3;Quebec City 46.81 -71.21 3=Quebec;Halifax 44.65 -63.57 3;Victoria 48.43 -123.37 3;Saskatoon 52.13 -106.67 3;Regina 50.45 -104.62 3;St Johns 47.56 -52.71 3
Mexico|NA|Mexico City 19.43 -99.13 1;Guadalajara 20.66 -103.35 2;Monterrey 25.69 -100.32 2;Cancun 21.16 -86.85 2;Tijuana 32.51 -117.04 3;Puebla 19.04 -98.21 3;Merida 20.97 -89.62 3;Acapulco 16.85 -99.82 3;Oaxaca 17.07 -96.73 3;Leon 21.12 -101.68 3;Veracruz 19.17 -96.13 3;Guanajuato 21.02 -101.26 3;Playa del Carmen 20.63 -87.08 3
Guatemala|NA|Guatemala City 14.63 -90.51 3=Guatemala
Belize|NA|Belize City 17.50 -88.20 3
Honduras|NA|Tegucigalpa 14.07 -87.19 3
El Salvador|NA|San Salvador 13.69 -89.19 3
Nicaragua|NA|Managua 12.14 -86.25 3
Costa Rica|NA|San Jose 9.93 -84.08 3
Panama|NA|Panama City 8.98 -79.52 2=Panama
Cuba|NA|Havana 23.11 -82.37 2
Jamaica|NA|Kingston 17.97 -76.79 3
Dominican Republic|NA|Santo Domingo 18.49 -69.93 3;Punta Cana 18.58 -68.40 3
Haiti|NA|Port-au-Prince 18.59 -72.31 3
Puerto Rico|NA|San Juan 18.47 -66.11 3
Bahamas|NA|Nassau 25.05 -77.36 3
Trinidad and Tobago|NA|Port of Spain 10.65 -61.51 3
Barbados|NA|Bridgetown 13.10 -59.61 3
Brazil|SA|Sao Paulo -23.55 -46.63 1;Rio de Janeiro -22.91 -43.17 1=Rio;Brasilia -15.79 -47.88 2;Salvador -12.97 -38.50 3;Fortaleza -3.73 -38.53 3;Belo Horizonte -19.92 -43.94 3;Manaus -3.12 -60.02 3;Curitiba -25.43 -49.27 3;Recife -8.05 -34.88 3;Porto Alegre -30.03 -51.23 3;Belem -1.46 -48.50 3;Florianopolis -27.60 -48.55 3
Argentina|SA|Buenos Aires -34.60 -58.38 1;Cordoba -31.42 -64.18 3;Rosario -32.95 -60.64 3;Mendoza -32.89 -68.84 3;Ushuaia -54.80 -68.30 3
Chile|SA|Santiago -33.45 -70.67 2;Valparaiso -33.05 -71.62 3;Punta Arenas -53.16 -70.91 3
Peru|SA|Lima -12.05 -77.04 2;Cusco -13.53 -71.97 3;Arequipa -16.41 -71.54 3
Colombia|SA|Bogota 4.71 -74.07 2;Medellin 6.24 -75.58 2;Cali 3.45 -76.53 3;Cartagena 10.39 -75.48 3;Barranquilla 10.96 -74.80 3
Venezuela|SA|Caracas 10.48 -66.90 2;Maracaibo 10.65 -71.64 3
Ecuador|SA|Quito -0.18 -78.47 3;Guayaquil -2.17 -79.92 3
Bolivia|SA|La Paz -16.50 -68.15 3;Sucre -19.03 -65.26 3
Paraguay|SA|Asuncion -25.26 -57.58 3
Uruguay|SA|Montevideo -34.90 -56.16 3
Guyana|SA|Georgetown 6.80 -58.16 3
Suriname|SA|Paramaribo 5.85 -55.20 3
Australia|OC|Sydney -33.87 151.21 1;Melbourne -37.81 144.96 1;Brisbane -27.47 153.03 2;Perth -31.95 115.86 2;Adelaide -34.93 138.60 2;Canberra -35.28 149.13 2;Gold Coast -28.02 153.40 3;Darwin -12.46 130.84 3;Hobart -42.88 147.33 3;Cairns -16.92 145.77 3
New Zealand|OC|Auckland -36.85 174.76 2;Wellington -41.29 174.78 2;Christchurch -43.53 172.64 3;Queenstown -45.03 168.66 3
Papua New Guinea|OC|Port Moresby -9.44 147.18 3
Fiji|OC|Suva -18.14 178.44 3
Samoa|OC|Apia -13.83 -171.76 3
Tonga|OC|Nukualofa -21.14 -175.20 3
Vanuatu|OC|Port Vila -17.73 168.32 3
`;
