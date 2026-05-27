export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type Booking = {
  id: string;
  ref: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  room: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  notes: string;
  status: BookingStatus;
  createdAt: string;
};

export type Room = {
  id: string;
  name: string;
  category: string;
  price: number;
  capacity: number;
  available: boolean;
};

export type Apartment = {
  id: string;
  name: string;
  type: string;
  price: number;
  bedrooms: number;
  available: boolean;
};

export type MenuItem = {
  name: string;
  description: string;
  price: number;
  category: string;
};

export const mockBookings: Booking[] = [
  {
    id: "b1", ref: "PND-7A2X", name: "Adebola Okonkwo", email: "adebola@email.com",
    phone: "+234 812 345 6789", service: "hotel", room: "Mandela Suite",
    checkIn: "2026-06-01", checkOut: "2026-06-04", guests: "2",
    notes: "Celebrating anniversary, would love a flower arrangement", status: "pending",
    createdAt: "2026-05-25",
  },
  {
    id: "b2", ref: "PND-9B4K", name: "Funke Adeleke", email: "funke@email.com",
    phone: "+234 803 111 2222", service: "apartment", room: "Three Bedroom Apartment",
    checkIn: "2026-06-10", checkOut: "2026-06-17", guests: "5",
    notes: "Family holiday, two children", status: "confirmed",
    createdAt: "2026-05-24",
  },
  {
    id: "b3", ref: "PND-3C1M", name: "Chukwuemeka Eze", email: "emeka@corp.ng",
    phone: "+234 705 999 8888", service: "event-hall", room: "Nwando's Event Hall",
    checkIn: "2026-07-15", checkOut: "2026-07-15", guests: "300",
    notes: "Annual company dinner, need projector and PA system", status: "pending",
    createdAt: "2026-05-23",
  },
  {
    id: "b4", ref: "PND-5D8Q", name: "Ngozi Madu", email: "ngozi@gmail.com",
    phone: "+234 816 555 4444", service: "lounge-bar", room: "DarNis Lounge",
    checkIn: "2026-05-28", checkOut: "2026-05-28", guests: "10",
    notes: "Birthday dinner reservation for 10 guests", status: "confirmed",
    createdAt: "2026-05-22",
  },
  {
    id: "b5", ref: "PND-2E6R", name: "Taiwo Olawale", email: "taiwo@email.com",
    phone: "+234 801 222 3333", service: "hotel", room: "Fela Standard Room",
    checkIn: "2026-06-05", checkOut: "2026-06-07", guests: "1",
    notes: "", status: "cancelled",
    createdAt: "2026-05-20",
  },
];

export const mockRooms: Room[] = [
  { id: "nkrumah-basic-room", name: "Nkrumah Basic Room", category: "Standard", price: 23000, capacity: 2, available: true },
  { id: "fela-standard-room", name: "Fela Standard Room", category: "Standard", price: 28000, capacity: 2, available: true },
  { id: "zik-standard-plus-room", name: "Zik Standard Plus Room", category: "Deluxe", price: 33000, capacity: 3, available: true },
  { id: "mandela-suite", name: "Mandela Suite", category: "Suite", price: 55000, capacity: 4, available: true },
];

export const mockApartments: Apartment[] = [
  { id: "one-bedroom-apartment", name: "One Bedroom Apartment", type: "1-Bedroom", price: 100000, bedrooms: 1, available: true },
  { id: "two-bedroom-apartment-a", name: "Two Bedroom Apartment A", type: "2-Bedroom", price: 130000, bedrooms: 2, available: true },
  { id: "two-bedroom-apartment-b", name: "Two Bedroom Apartment B", type: "2-Bedroom", price: 130000, bedrooms: 2, available: false },
  { id: "three-bedroom-apartment", name: "Three Bedroom Apartment", type: "3-Bedroom", price: 160000, bedrooms: 3, available: true },
  { id: "four-bedroom-apartment", name: "Four Bedroom Apartment", type: "4-Bedroom", price: 180000, bedrooms: 4, available: true },
];

export const mockLoungeMenu: MenuItem[] = [
  { name: "Signature Cocktail", description: "Premium spirits blended with fresh tropical fruits", price: 5000, category: "Cocktails" },
  { name: "Classic Old Fashioned", description: "Bourbon whiskey, Angostura bitters, sugar, orange peel", price: 6000, category: "Cocktails" },
  { name: "Mojito", description: "White rum, fresh mint, lime juice, sugar, soda water", price: 4500, category: "Cocktails" },
  { name: "Premium Red Wine", description: "Carefully selected premium red wine by the glass", price: 7000, category: "Wines" },
  { name: "Premium White Wine", description: "Chilled premium white wine by the glass", price: 7000, category: "Wines" },
  { name: "Craft Beer", description: "Cold refreshing craft beer selection", price: 3000, category: "Beers" },
  { name: "Premium Spirits", description: "Fine whisky, cognac, vodka, gin — served neat or on the rocks", price: 8000, category: "Spirits" },
  { name: "Soft Drinks & Mocktails", description: "Refreshing non-alcoholic options", price: 1500, category: "Non-Alcoholic" },
];
