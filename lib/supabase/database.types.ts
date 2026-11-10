/**
 * Supabase database types for seicase.
 * Regenerate after changing migrations:  npm run db:types
 * (uses the Supabase CLI: supabase gen types typescript --project-id <id>)
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13.0.5" };
  public: {
    Tables: {
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string | null;
          full_name: string;
          phone: string;
          line1: string;
          line2: string | null;
          landmark: string | null;
          city: string;
          state: string;
          pincode: string;
          country: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          label?: string | null;
          full_name: string;
          phone: string;
          line1: string;
          line2?: string | null;
          landmark?: string | null;
          city: string;
          state: string;
          pincode: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string | null;
          full_name?: string;
          phone?: string;
          line1?: string;
          line2?: string | null;
          landmark?: string | null;
          city?: string;
          state?: string;
          pincode?: string;
          country?: string;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      analytics_events: {
        Row: {
          id: number;
          event_name: string;
          session_id: string;
          user_id: string | null;
          product_id: string | null;
          order_id: string | null;
          path: string | null;
          referrer: string | null;
          referrer_host: string | null;
          utm_source: string | null;
          utm_medium: string | null;
          utm_campaign: string | null;
          utm_term: string | null;
          utm_content: string | null;
          device_type: string | null;
          browser: string | null;
          os: string | null;
          country: string | null;
          region: string | null;
          city: string | null;
          search_query: string | null;
          results_count: number | null;
          value: number | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          event_name: string;
          session_id: string;
          user_id?: string | null;
          product_id?: string | null;
          order_id?: string | null;
          path?: string | null;
          referrer?: string | null;
          referrer_host?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_term?: string | null;
          utm_content?: string | null;
          device_type?: string | null;
          browser?: string | null;
          os?: string | null;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          search_query?: string | null;
          results_count?: number | null;
          value?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          event_name?: string;
          session_id?: string;
          user_id?: string | null;
          product_id?: string | null;
          order_id?: string | null;
          path?: string | null;
          referrer?: string | null;
          referrer_host?: string | null;
          utm_source?: string | null;
          utm_medium?: string | null;
          utm_campaign?: string | null;
          utm_term?: string | null;
          utm_content?: string | null;
          device_type?: string | null;
          browser?: string | null;
          os?: string | null;
          country?: string | null;
          region?: string | null;
          city?: string | null;
          search_query?: string | null;
          results_count?: number | null;
          value?: number | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [

        ];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_email: string | null;
          action: string;
          entity: string;
          entity_id: string | null;
          summary: string | null;
          changes: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action: string;
          entity: string;
          entity_id?: string | null;
          summary?: string | null;
          changes?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          action?: string;
          entity?: string;
          entity_id?: string | null;
          summary?: string | null;
          changes?: Json | null;
          created_at?: string;
        };
        Relationships: [

        ];
      };
      cart_items: {
        Row: {
          id: string;
          cart_id: string;
          product_id: string;
          variant_id: string;
          charm_id: string | null;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          cart_id: string;
          product_id: string;
          variant_id: string;
          charm_id?: string | null;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          cart_id?: string;
          product_id?: string;
          variant_id?: string;
          charm_id?: string | null;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_charm_id_fkey";
            columns: ["charm_id"];
            isOneToOne: false;
            referencedRelation: "charms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          id: string;
          user_id: string | null;
          email: string | null;
          session_id: string | null;
          status: Database["public"]["Enums"]["cart_status"];
          subtotal: number;
          item_count: number;
          recovery_token: string;
          last_activity_at: string;
          abandoned_at: string | null;
          reminder_sent_at: string | null;
          recovered_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          session_id?: string | null;
          status?: Database["public"]["Enums"]["cart_status"];
          subtotal?: number;
          item_count?: number;
          recovery_token?: string;
          last_activity_at?: string;
          abandoned_at?: string | null;
          reminder_sent_at?: string | null;
          recovered_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          email?: string | null;
          session_id?: string | null;
          status?: Database["public"]["Enums"]["cart_status"];
          subtotal?: number;
          item_count?: number;
          recovery_token?: string;
          last_activity_at?: string;
          abandoned_at?: string | null;
          reminder_sent_at?: string | null;
          recovered_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "carts_recovered_order_id_fkey";
            columns: ["recovered_order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_visible: boolean;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      charms: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          cost_price: number | null;
          image_url: string | null;
          stock: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          price?: number;
          cost_price?: number | null;
          image_url?: string | null;
          stock?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          cost_price?: number | null;
          image_url?: string | null;
          stock?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      collections: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_visible: boolean;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      contact_messages: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          subject: string | null;
          message: string;
          is_read: boolean;
          replied_at: string | null;
          reply_body: string | null;
          ip_hash: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          phone?: string | null;
          subject?: string | null;
          message: string;
          is_read?: boolean;
          replied_at?: string | null;
          reply_body?: string | null;
          ip_hash?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          phone?: string | null;
          subject?: string | null;
          message?: string;
          is_read?: boolean;
          replied_at?: string | null;
          reply_body?: string | null;
          ip_hash?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [

        ];
      };
      coupon_redemptions: {
        Row: {
          id: string;
          coupon_id: string;
          order_id: string;
          user_id: string | null;
          email: string | null;
          discount_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          coupon_id: string;
          order_id: string;
          user_id?: string | null;
          email?: string | null;
          discount_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          coupon_id?: string;
          order_id?: string;
          user_id?: string | null;
          email?: string | null;
          discount_amount?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coupon_redemptions_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          description: string | null;
          type: Database["public"]["Enums"]["discount_type"];
          value: number;
          min_order: number;
          max_discount: number | null;
          usage_limit: number | null;
          usage_count: number;
          per_customer_limit: number | null;
          starts_at: string | null;
          expires_at: string | null;
          is_active: boolean;
          auto_apply: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          description?: string | null;
          type?: Database["public"]["Enums"]["discount_type"];
          value: number;
          min_order?: number;
          max_discount?: number | null;
          usage_limit?: number | null;
          usage_count?: number;
          per_customer_limit?: number | null;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          auto_apply?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          description?: string | null;
          type?: Database["public"]["Enums"]["discount_type"];
          value?: number;
          min_order?: number;
          max_discount?: number | null;
          usage_limit?: number | null;
          usage_count?: number;
          per_customer_limit?: number | null;
          starts_at?: string | null;
          expires_at?: string | null;
          is_active?: boolean;
          auto_apply?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      faqs: {
        Row: {
          id: string;
          question: string;
          answer: string;
          category: string;
          sort_order: number;
          is_popular: boolean;
          is_visible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          category?: string;
          sort_order?: number;
          is_popular?: boolean;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string;
          category?: string;
          sort_order?: number;
          is_popular?: boolean;
          is_visible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      hero_slides: {
        Row: {
          id: string;
          eyebrow: string | null;
          title: string;
          subtitle: string | null;
          cta_label: string | null;
          cta_href: string | null;
          image_url: string;
          mobile_image_url: string | null;
          alt: string | null;
          text_tone: string;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          eyebrow?: string | null;
          title: string;
          subtitle?: string | null;
          cta_label?: string | null;
          cta_href?: string | null;
          image_url: string;
          mobile_image_url?: string | null;
          alt?: string | null;
          text_tone?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          eyebrow?: string | null;
          title?: string;
          subtitle?: string | null;
          cta_label?: string | null;
          cta_href?: string | null;
          image_url?: string;
          mobile_image_url?: string | null;
          alt?: string | null;
          text_tone?: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      inventory_movements: {
        Row: {
          id: string;
          variant_id: string | null;
          charm_id: string | null;
          product_id: string | null;
          change: number;
          stock_after: number | null;
          type: Database["public"]["Enums"]["movement_type"];
          reason: string | null;
          order_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id?: string | null;
          charm_id?: string | null;
          product_id?: string | null;
          change: number;
          stock_after?: number | null;
          type: Database["public"]["Enums"]["movement_type"];
          reason?: string | null;
          order_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          variant_id?: string | null;
          charm_id?: string | null;
          product_id?: string | null;
          change?: number;
          stock_after?: number | null;
          type?: Database["public"]["Enums"]["movement_type"];
          reason?: string | null;
          order_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_charm_id_fkey";
            columns: ["charm_id"];
            isOneToOne: false;
            referencedRelation: "charms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      journal_posts: {
        Row: {
          id: string;
          title: string;
          slug: string;
          excerpt: string | null;
          content: string;
          cover_image: string | null;
          author: string | null;
          tags: string[];
          status: Database["public"]["Enums"]["publish_status"];
          published_at: string | null;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          excerpt?: string | null;
          content?: string;
          cover_image?: string | null;
          author?: string | null;
          tags?: string[];
          status?: Database["public"]["Enums"]["publish_status"];
          published_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          slug?: string;
          excerpt?: string | null;
          content?: string;
          cover_image?: string | null;
          author?: string | null;
          tags?: string[];
          status?: Database["public"]["Enums"]["publish_status"];
          published_at?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          source: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          source?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          source?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [

        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          variant_id: string | null;
          charm_id: string | null;
          parent_item_id: string | null;
          product_name: string;
          variant_name: string | null;
          sku: string | null;
          image_url: string | null;
          unit_price: number;
          quantity: number;
          line_total: number;
          cost_price: number;
          gst_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          charm_id?: string | null;
          parent_item_id?: string | null;
          product_name: string;
          variant_name?: string | null;
          sku?: string | null;
          image_url?: string | null;
          unit_price: number;
          quantity: number;
          line_total: number;
          cost_price?: number;
          gst_rate?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          variant_id?: string | null;
          charm_id?: string | null;
          parent_item_id?: string | null;
          product_name?: string;
          variant_name?: string | null;
          sku?: string | null;
          image_url?: string | null;
          unit_price?: number;
          quantity?: number;
          line_total?: number;
          cost_price?: number;
          gst_rate?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_charm_id_fkey";
            columns: ["charm_id"];
            isOneToOne: false;
            referencedRelation: "charms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_parent_item_id_fkey";
            columns: ["parent_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
          note: string | null;
          is_customer_visible: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          is_customer_visible?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: Database["public"]["Enums"]["order_status"];
          note?: string | null;
          is_customer_visible?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          id: string;
          order_number: string;
          access_token: string;
          user_id: string | null;
          email: string;
          phone: string | null;
          customer_name: string | null;
          status: Database["public"]["Enums"]["order_status"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          payment_method: Database["public"]["Enums"]["payment_method"];
          subtotal: number;
          discount_total: number;
          shipping_total: number;
          cod_fee: number;
          tax_total: number;
          total: number;
          cost_total: number;
          refunded_total: number;
          coupon_id: string | null;
          coupon_code: string | null;
          shipping_address: Json;
          billing_address: Json | null;
          customer_notes: string | null;
          internal_notes: string | null;
          tracking_number: string | null;
          courier: string | null;
          tracking_url: string | null;
          razorpay_order_id: string | null;
          session_id: string | null;
          utm: Json | null;
          placed_at: string | null;
          shipped_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_number?: string;
          access_token?: string;
          user_id?: string | null;
          email: string;
          phone?: string | null;
          customer_name?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          subtotal?: number;
          discount_total?: number;
          shipping_total?: number;
          cod_fee?: number;
          tax_total?: number;
          total?: number;
          cost_total?: number;
          refunded_total?: number;
          coupon_id?: string | null;
          coupon_code?: string | null;
          shipping_address: Json;
          billing_address?: Json | null;
          customer_notes?: string | null;
          internal_notes?: string | null;
          tracking_number?: string | null;
          courier?: string | null;
          tracking_url?: string | null;
          razorpay_order_id?: string | null;
          session_id?: string | null;
          utm?: Json | null;
          placed_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_number?: string;
          access_token?: string;
          user_id?: string | null;
          email?: string;
          phone?: string | null;
          customer_name?: string | null;
          status?: Database["public"]["Enums"]["order_status"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          payment_method?: Database["public"]["Enums"]["payment_method"];
          subtotal?: number;
          discount_total?: number;
          shipping_total?: number;
          cod_fee?: number;
          tax_total?: number;
          total?: number;
          cost_total?: number;
          refunded_total?: number;
          coupon_id?: string | null;
          coupon_code?: string | null;
          shipping_address?: Json;
          billing_address?: Json | null;
          customer_notes?: string | null;
          internal_notes?: string | null;
          tracking_number?: string | null;
          courier?: string | null;
          tracking_url?: string | null;
          razorpay_order_id?: string | null;
          session_id?: string | null;
          utm?: Json | null;
          placed_at?: string | null;
          shipped_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey";
            columns: ["coupon_id"];
            isOneToOne: false;
            referencedRelation: "coupons";
            referencedColumns: ["id"];
          },
        ];
      };
      pages: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          content: string;
          hero_image: string | null;
          seo_title: string | null;
          seo_description: string | null;
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          subtitle?: string | null;
          content?: string;
          hero_image?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          title?: string;
          subtitle?: string | null;
          content?: string;
          hero_image?: string | null;
          seo_title?: string | null;
          seo_description?: string | null;
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      payment_webhook_logs: {
        Row: {
          id: string;
          event: string | null;
          razorpay_event_id: string | null;
          signature_valid: boolean;
          processed: boolean;
          error: string | null;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event?: string | null;
          razorpay_event_id?: string | null;
          signature_valid?: boolean;
          processed?: boolean;
          error?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event?: string | null;
          razorpay_event_id?: string | null;
          signature_valid?: boolean;
          processed?: boolean;
          error?: string | null;
          payload?: Json | null;
          created_at?: string;
        };
        Relationships: [

        ];
      };
      payments: {
        Row: {
          id: string;
          order_id: string | null;
          provider: string;
          razorpay_order_id: string | null;
          razorpay_payment_id: string | null;
          razorpay_signature: string | null;
          amount: number;
          currency: string;
          status: string;
          method: string | null;
          error_code: string | null;
          error_description: string | null;
          raw: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          provider?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          method?: string | null;
          error_code?: string | null;
          error_description?: string | null;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          provider?: string;
          razorpay_order_id?: string | null;
          razorpay_payment_id?: string | null;
          razorpay_signature?: string | null;
          amount?: number;
          currency?: string;
          status?: string;
          method?: string | null;
          error_code?: string | null;
          error_description?: string | null;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          variant_id: string | null;
          url: string;
          alt: string | null;
          kind: string;
          sort_order: number;
          is_primary: boolean;
          width: number | null;
          height: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          variant_id?: string | null;
          url: string;
          alt?: string | null;
          kind?: string;
          sort_order?: number;
          is_primary?: boolean;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          variant_id?: string | null;
          url?: string;
          alt?: string | null;
          kind?: string;
          sort_order?: number;
          is_primary?: boolean;
          width?: number | null;
          height?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_images_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
      product_styles: {
        Row: {
          product_id: string;
          style_id: string;
        };
        Insert: {
          product_id: string;
          style_id: string;
        };
        Update: {
          product_id?: string;
          style_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_styles_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "product_styles_style_id_fkey";
            columns: ["style_id"];
            isOneToOne: false;
            referencedRelation: "styles";
            referencedColumns: ["id"];
          },
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          colour_name: string;
          colour_hex: string;
          sku: string;
          stock: number;
          price_override: number | null;
          is_default: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          colour_name: string;
          colour_hex?: string;
          sku: string;
          stock?: number;
          price_override?: number | null;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          colour_name?: string;
          colour_hex?: string;
          sku?: string;
          stock?: number;
          price_override?: number | null;
          is_default?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          id: string;
          name: string;
          slug: string;
          short_description: string | null;
          description: string | null;
          category_id: string | null;
          collection_id: string | null;
          material: string | null;
          dimensions: string | null;
          width_cm: number | null;
          height_cm: number | null;
          depth_cm: number | null;
          strap_drop_cm: number | null;
          weight_g: number | null;
          care_instructions: string | null;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          gst_rate: number;
          status: Database["public"]["Enums"]["publish_status"];
          publish_at: string | null;
          is_featured: boolean;
          is_trending: boolean;
          is_new: boolean;
          has_spin: boolean;
          low_stock_threshold: number;
          seo_title: string | null;
          seo_description: string | null;
          rating_avg: number;
          rating_count: number;
          total_sold: number;
          sort_order: number;
          search_text: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          short_description?: string | null;
          description?: string | null;
          category_id?: string | null;
          collection_id?: string | null;
          material?: string | null;
          dimensions?: string | null;
          width_cm?: number | null;
          height_cm?: number | null;
          depth_cm?: number | null;
          strap_drop_cm?: number | null;
          weight_g?: number | null;
          care_instructions?: string | null;
          price: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          gst_rate?: number;
          status?: Database["public"]["Enums"]["publish_status"];
          publish_at?: string | null;
          is_featured?: boolean;
          is_trending?: boolean;
          is_new?: boolean;
          has_spin?: boolean;
          low_stock_threshold?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          rating_avg?: number;
          rating_count?: number;
          total_sold?: number;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          short_description?: string | null;
          description?: string | null;
          category_id?: string | null;
          collection_id?: string | null;
          material?: string | null;
          dimensions?: string | null;
          width_cm?: number | null;
          height_cm?: number | null;
          depth_cm?: number | null;
          strap_drop_cm?: number | null;
          weight_g?: number | null;
          care_instructions?: string | null;
          price?: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          gst_rate?: number;
          status?: Database["public"]["Enums"]["publish_status"];
          publish_at?: string | null;
          is_featured?: boolean;
          is_trending?: boolean;
          is_new?: boolean;
          has_spin?: boolean;
          low_stock_threshold?: number;
          seo_title?: string | null;
          seo_description?: string | null;
          rating_avg?: number;
          rating_count?: number;
          total_sold?: number;
          sort_order?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          role: Database["public"]["Enums"]["user_role"];
          is_blocked: boolean;
          marketing_opt_in: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          is_blocked?: boolean;
          marketing_opt_in?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          is_blocked?: boolean;
          marketing_opt_in?: boolean;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      rate_limits: {
        Row: {
          key: string;
          window_start: string;
          count: number;
        };
        Insert: {
          key: string;
          window_start?: string;
          count?: number;
        };
        Update: {
          key?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: [

        ];
      };
      returns: {
        Row: {
          id: string;
          return_number: string;
          order_id: string;
          user_id: string | null;
          order_item_ids: string[];
          type: string;
          reason: string;
          details: string | null;
          images: string[];
          status: Database["public"]["Enums"]["return_status"];
          refund_amount: number | null;
          refund_reference: string | null;
          restocked: boolean;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          return_number?: string;
          order_id: string;
          user_id?: string | null;
          order_item_ids?: string[];
          type?: string;
          reason: string;
          details?: string | null;
          images?: string[];
          status?: Database["public"]["Enums"]["return_status"];
          refund_amount?: number | null;
          refund_reference?: string | null;
          restocked?: boolean;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          return_number?: string;
          order_id?: string;
          user_id?: string | null;
          order_item_ids?: string[];
          type?: string;
          reason?: string;
          details?: string | null;
          images?: string[];
          status?: Database["public"]["Enums"]["return_status"];
          refund_amount?: number | null;
          refund_reference?: string | null;
          restocked?: boolean;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "returns_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string | null;
          order_id: string | null;
          author_name: string;
          rating: number;
          title: string | null;
          body: string | null;
          images: string[];
          status: Database["public"]["Enums"]["review_status"];
          is_verified: boolean;
          admin_reply: string | null;
          replied_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id?: string | null;
          order_id?: string | null;
          author_name: string;
          rating: number;
          title?: string | null;
          body?: string | null;
          images?: string[];
          status?: Database["public"]["Enums"]["review_status"];
          is_verified?: boolean;
          admin_reply?: string | null;
          replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          user_id?: string | null;
          order_id?: string | null;
          author_name?: string;
          rating?: number;
          title?: string | null;
          body?: string | null;
          images?: string[];
          status?: Database["public"]["Enums"]["review_status"];
          is_verified?: boolean;
          admin_reply?: string | null;
          replied_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          key: string;
          value: Json;
          is_public: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value?: Json;
          is_public?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          is_public?: boolean;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      styles: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_visible: boolean;
          seo_title: string | null;
          seo_description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          image_url?: string | null;
          sort_order?: number;
          is_visible?: boolean;
          seo_title?: string | null;
          seo_description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [

        ];
      };
      wishlists: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          variant_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          variant_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          variant_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wishlists_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "product_variants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      mv_daily_sales: {
        Row: {
          day: string | null;
          orders: number | null;
          revenue: number | null;
          discount: number | null;
          shipping: number | null;
          gross_profit: number | null;
          units: number | null;
        };
        Relationships: [];
      };
      mv_product_stats: {
        Row: {
          product_id: string | null;
          name: string | null;
          views_30d: number | null;
          units_sold: number | null;
          revenue: number | null;
          wishlisted: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      adjust_stock: { Args: { p_variant_id: string; p_change: number; p_type?: Database["public"]["Enums"]["movement_type"]; p_reason?: string }; Returns: number };
      admin_tracker_counts: { Args: never; Returns: Json };
      analytics_kpis: { Args: { p_from: string; p_to: string }; Returns: Json };
      analytics_realtime: { Args: never; Returns: Json };
      analytics_report: { Args: { p_from: string; p_to: string }; Returns: Json };
      analytics_sales_series: { Args: { p_from: string; p_to: string; p_grain?: string }; Returns: Json };
      assert_staff: { Args: never; Returns: undefined };
      best_auto_coupon: { Args: { p_subtotal: number; p_user_id?: string; p_email?: string }; Returns: { coupon_id: string; code: string; discount: number; message: string }[] };
      check_rate_limit: { Args: { p_key: string; p_limit: number; p_window_seconds: number }; Returns: boolean };
      create_order: { Args: { p: Json }; Returns: Json };
      current_role_name: { Args: never; Returns: Database["public"]["Enums"]["user_role"] };
      evaluate_coupon: { Args: { p_code: string; p_subtotal: number; p_user_id?: string; p_email?: string }; Returns: { coupon_id: string; code: string; discount: number; message: string }[] };
      get_setting: { Args: { p_key: string }; Returns: Json };
      has_purchased: { Args: { p_product_id: string; p_user_id?: string }; Returns: boolean };
      is_admin: { Args: never; Returns: boolean };
      is_product_public: { Args: { p_product_id: string }; Returns: boolean };
      is_staff: { Args: never; Returns: boolean };
      mark_abandoned_carts: { Args: { p_minutes?: number }; Returns: number };
      mark_order_paid: { Args: { p_order_id: string; p_razorpay_order_id: string; p_razorpay_payment_id: string; p_signature: string; p_amount_paise: number; p_method: string; p_raw?: Json }; Returns: Json };
      purge_rate_limits: { Args: never; Returns: undefined };
      refresh_analytics_views: { Args: never; Returns: undefined };
      release_order: { Args: { p_order_id: string; p_reason?: string; p_actor?: string }; Returns: undefined };
      release_stale_pending_orders: { Args: { p_minutes?: number }; Returns: number };
      set_stock: { Args: { p_variant_id: string; p_stock: number; p_reason?: string }; Returns: number };
      slugify: { Args: { value: string }; Returns: string };
    };
    Enums: {
      cart_status: "active" | "converted" | "abandoned" | "recovered";
      discount_type: "percentage" | "flat";
      movement_type: "sale" | "restock" | "return" | "adjustment" | "cancellation";
      order_status: "pending" | "placed" | "confirmed" | "shipped" | "out_for_delivery" | "delivered" | "cancelled" | "returned";
      payment_method: "razorpay" | "cod";
      payment_status: "pending" | "paid" | "failed" | "refunded" | "partially_refunded";
      publish_status: "draft" | "published" | "archived";
      return_status: "requested" | "approved" | "rejected" | "received" | "refunded" | "exchanged";
      review_status: "pending" | "approved" | "hidden";
      user_role: "customer" | "staff" | "admin";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
