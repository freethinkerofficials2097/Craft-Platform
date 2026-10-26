// towns-adjacency.js - which DISTRICTS touch each other (land borders, plus the short sea link between Penang island and the
// mainland). Used for the ORANGE clue: a guessed place is "a direct neighbour" of the secret place when it lies in the SAME district
// or in a district that borders the secret place's district (the state border does not matter, e.g. Muar <-> Jasin).
// One line per district:   District: neighbour, neighbour, ...      You only have to write a border ONCE - it is mirrored automatically.
// District names must match the district names used in towns-data-*.js. Edit freely; `npm run check:towns` checks the list.

export const TOWN_ADJACENCY = `
Johor Bahru: Kulai, Pontian, Kota Tinggi
Pontian: Kulai, Batu Pahat
Kulai: Batu Pahat, Kluang, Kota Tinggi
Batu Pahat: Kluang, Muar, Ledang
Kluang: Kota Tinggi, Mersing, Segamat, Ledang
Kota Tinggi: Mersing
Mersing: Segamat, Rompin
Segamat: Ledang, Tampin, Bera
Ledang: Muar, Jasin
Muar: Jasin
Melaka Tengah: Alor Gajah, Jasin
Alor Gajah: Jasin, Tampin, Rembau, Port Dickson
Jasin: Tampin
Seremban: Port Dickson, Rembau, Kuala Pilah, Jelebu, Hulu Langat, Sepang
Port Dickson: Rembau, Sepang
Rembau: Kuala Pilah, Tampin
Tampin: Kuala Pilah, Jempol
Kuala Pilah: Jempol, Jelebu
Jempol: Jelebu, Temerloh, Bera
Jelebu: Hulu Langat, Bentong, Temerloh
Petaling: Klang, Kuala Selangor, Gombak, Kuala Lumpur, Hulu Langat, Sepang, Kuala Langat, Putrajaya
Klang: Kuala Selangor, Kuala Langat
Kuala Langat: Sepang
Sepang: Hulu Langat, Putrajaya
Hulu Langat: Gombak, Kuala Lumpur, Putrajaya, Bentong
Gombak: Hulu Selangor, Kuala Selangor, Kuala Lumpur, Bentong
Kuala Selangor: Sabak Bernam, Hulu Selangor
Sabak Bernam: Hulu Selangor, Hilir Perak, Bagan Datuk
Hulu Selangor: Muallim, Raub
Kuala Lumpur: Gombak, Hulu Langat, Petaling
Perlis: Kubang Pasu, Langkawi
Kubang Pasu: Langkawi
Kubang Pasu: Kota Setar, Pokok Sena, Padang Terap
Kota Setar: Pokok Sena, Pendang, Yan
Pokok Sena: Padang Terap, Pendang
Padang Terap: Pendang, Sik
Pendang: Sik, Baling, Kuala Muda
Yan: Kuala Muda
Kuala Muda: Baling, Kulim, Seberang Perai Utara, Seberang Perai Tengah
Baling: Sik, Kulim, Hulu Perak, Larut Matang dan Selama
Kulim: Bandar Baharu, Seberang Perai Tengah, Seberang Perai Selatan, Kerian, Larut Matang dan Selama
Bandar Baharu: Kerian, Seberang Perai Selatan
Seberang Perai Utara: Seberang Perai Tengah, Timur Laut
Seberang Perai Tengah: Seberang Perai Selatan, Timur Laut
Seberang Perai Selatan: Kerian, Barat Daya
Timur Laut: Barat Daya
Kerian: Larut Matang dan Selama
Larut Matang dan Selama: Kuala Kangsar, Hulu Perak, Manjung
Kuala Kangsar: Hulu Perak, Kinta, Perak Tengah
Hulu Perak: Gua Musang, Jeli
Kinta: Kampar, Perak Tengah, Cameron Highlands
Kampar: Perak Tengah, Batang Padang
Perak Tengah: Manjung, Hilir Perak, Batang Padang
Manjung: Hilir Perak
Hilir Perak: Bagan Datuk, Batang Padang, Muallim
Batang Padang: Muallim, Cameron Highlands
Cameron Highlands: Lipis, Gua Musang
Kota Bharu: Tumpat, Pasir Mas, Bachok, Machang, Pasir Puteh
Tumpat: Pasir Mas
Pasir Mas: Machang, Tanah Merah
Bachok: Pasir Puteh
Pasir Puteh: Machang, Besut
Machang: Tanah Merah, Kuala Krai
Tanah Merah: Jeli, Kuala Krai
Jeli: Kuala Krai, Gua Musang
Kuala Krai: Gua Musang, Hulu Terengganu
Gua Musang: Lipis
Besut: Setiu, Hulu Terengganu
Setiu: Kuala Nerus, Hulu Terengganu
Kuala Nerus: Kuala Terengganu, Hulu Terengganu
Kuala Terengganu: Marang, Hulu Terengganu
Hulu Terengganu: Marang, Dungun
Marang: Dungun
Dungun: Kemaman
Kemaman: Kuantan
Kuantan: Pekan, Maran, Jerantut
Pekan: Maran, Temerloh, Bera, Rompin
Rompin: Bera
Bera: Temerloh
Maran: Temerloh, Jerantut
Temerloh: Bentong, Jerantut
Jerantut: Lipis, Raub
Lipis: Raub
Raub: Bentong
Kota Kinabalu: Penampang, Putatan, Tuaran
Putatan: Penampang, Papar
Penampang: Papar, Tambunan, Tuaran
Papar: Tambunan, Keningau, Beaufort
Tuaran: Kota Belud, Ranau
Kota Belud: Ranau, Kota Marudu
Ranau: Kota Marudu, Tambunan, Telupid, Beluran
Tambunan: Keningau
Keningau: Beaufort, Tenom, Nabawan, Tongod
Tenom: Beaufort, Sipitang, Nabawan
Beaufort: Kuala Penyu, Sipitang
Sipitang: Nabawan, Lawas
Nabawan: Tongod, Lawas
Kudat: Kota Marudu, Pitas
Kota Marudu: Pitas, Beluran
Pitas: Beluran
Beluran: Telupid, Sandakan, Kinabatangan
Telupid: Tongod, Kinabatangan
Tongod: Kinabatangan, Lahad Datu
Sandakan: Kinabatangan
Kinabatangan: Lahad Datu
Lahad Datu: Kunak, Tawau
Kunak: Semporna, Tawau
Semporna: Tawau
Labuan: Kuala Penyu
Kuching: Bau, Lundu, Samarahan, Asajaya, Serian
Bau: Lundu, Serian
Samarahan: Asajaya, Simunjan, Serian
Asajaya: Simunjan
Simunjan: Serian, Sri Aman, Pusa
Serian: Sri Aman, Tebedu
Sri Aman: Pusa, Betong, Lubok Antu
Lubok Antu: Betong
Betong: Pusa, Saratok
Pusa: Saratok, Kabong
Kabong: Saratok, Meradong, Sarikei
Saratok: Meradong, Julau, Pakan
Sarikei: Meradong, Julau
Meradong: Julau, Sibu, Kanowit
Julau: Pakan, Kanowit
Pakan: Kanowit, Song
Sibu: Kanowit, Selangau, Dalat
Kanowit: Selangau, Song, Kapit
Selangau: Mukah, Kapit
Dalat: Mukah, Daro, Tanjung Manis, Selangau
Daro: Matu, Tanjung Manis
Matu: Tanjung Manis
Mukah: Tatau
Kapit: Song, Belaga, Bukit Mabong, Pakan
Bukit Mabong: Belaga
Belaga: Bintulu, Tatau, Telang Usan
Tatau: Bintulu
Bintulu: Sebauh
Sebauh: Beluru, Subis, Belaga
Subis: Beluru, Miri, Marudi
Beluru: Miri, Marudi
Miri: Marudi
Marudi: Limbang, Telang Usan
Telang Usan: Limbang
Limbang: Lawas, Sundar
Sundar: Lawas
`;
