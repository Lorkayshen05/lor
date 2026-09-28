import type { CategorySlug } from "@/config/categories";
import type { OrderStatus } from "@/config/order-status";
import type { StockStatus } from "@/config/stock-status";

export interface Product {
  id: string;
  name: string;
  description: string;
  category: CategorySlug | string;
  price: number;
  unit: string;
  image_url: string | null;
  stock_status: StockStatus | string;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export type ProductInsert = Omit<
  Product,
  "id" | "created_at" | "updated_at"
>;

export type ProductUpdate = Partial<ProductInsert>;

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  notes: string | null;
  total_amount: number;
  status: OrderStatus | string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit: string | null;
  quantity: number;
  price: number;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
}

/** Minimal Supabase database shape for typed client generics. */
export interface Database {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Order, "id" | "created_at">>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id"> & { id?: string };
        Update: Partial<Omit<OrderItem, "id">>;
      };
    };
  };
}
