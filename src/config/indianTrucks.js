// Indian mini truck brands and models database
export const INDIAN_TRUCKS = {
  'Tata': ['Ace Gold', 'Ace EV', 'Ace Mega', 'Ace Mega XL', 'Ace Gold Petrol CX', 'Ace Gold Diesel', 'Ace Zip', 'Ace HT', 'Intra V10', 'Intra V20', 'Intra V30', 'Intra V50', 'Yodha 2.0', 'Yodha Pickup', '407 Gold SFC', '407 Gold', '709 LPT', '712 LPT', '1109 LPT', 'Ultra T.7', 'Ultra T.11', 'Ultra T.16'],
  'Mahindra': ['Bolero Pickup', 'Bolero Pickup Extra Long', 'Bolero Maxi Truck', 'Bolero City Pik-Up', 'Supro Profit Truck', 'Supro Profit Truck Mini', 'Supro Maxi Truck', 'Jeeto Plus', 'Jeeto L6-11', 'Jeeto S6-11', 'Loadking Optimo', 'Loadking Zoom', 'Furio 7 HD', 'Furio 12'],
  'Ashok Leyland': ['Dost+', 'Dost Strong', 'Dost CNG', 'Bada Dost', 'Bada Dost i4', 'Partner 6 Tyre', 'Partner 4 Tyre', 'Ecomet 1015', 'Ecomet 1115 HE', 'Boss 1112 LE'],
  'Maruti Suzuki': ['Super Carry', 'Super Carry Diesel', 'Super Carry CNG', 'Eeco Cargo'],
  'Piaggio': ['Ape Xtra Dlx', 'Ape Auto DX', 'Ape City+', 'Ape E-City', 'Porter 700', 'Porter 1000'],
  'Force': ['Traveller 26', 'Shaktiman 200', 'Shaktiman 400', 'Trump 40'],
  'Eicher': ['Pro 2049', 'Pro 2059 XP', 'Pro 2095 XP', 'Pro 2110 XP', 'Pro 3015', 'Pro 3018'],
  'BharatBenz': ['MDT 914R', 'MDT 1015R', 'MDT 1215R'],
  'SML Isuzu': ['Sartaj GS HG72', 'Samrat GS HG75', 'S7 Pro'],
};

// Flat list for search
export const ALL_TRUCK_MODELS = Object.entries(INDIAN_TRUCKS).flatMap(([brand, models]) => models.map(m => ({ brand, model: m, full: `${brand} ${m}` })));
