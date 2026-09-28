import type { CategorySlug } from "@/config/categories";
import type { OrderStatus } from "@/config/order-status";
import type { StockStatus } from "@/config/stock-status";

export type Product = {
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
};

export type ProductInsert = Omit<
  Product,
  "id" | "created_at" | "updated_at"
>;

export type ProductUpdate = Partial<ProductInsert>;

export type Order = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  notes: string | null;
  total_amount: number;
  status: OrderStatus | string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit: string | null;
  quantity: number;
  price: number;
};

export type OrderWithItems = Order & {
  order_items: OrderItem[];
};

/** Minimal Supabase database shape for typed client generics. */
export type Database = {
  public: {
    Tables: {
      products: {
        Row: Product;
        Insert: ProductInsert;
        Update: ProductUpdate;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: Omit<Order, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Order, "id" | "created_at">>;
        Relationships: [];
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, "id"> & { id?: string };
        Update: Partial<Omit<OrderItem, "id">>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
