export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auctions: {
        Row: {
          bid_count: number
          bid_increment: number
          category_id: string
          commission_rate: number
          created_at: string
          currency: string
          current_price: number
          ends_at: string
          id: string
          listing_id: string
          seller_id: string
          start_price: number
          starts_at: string
          status: Database["public"]["Enums"]["auction_status"]
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          bid_count?: number
          bid_increment?: number
          category_id: string
          commission_rate?: number
          created_at?: string
          currency?: string
          current_price?: number
          ends_at: string
          id?: string
          listing_id: string
          seller_id: string
          start_price?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["auction_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          bid_count?: number
          bid_increment?: number
          category_id?: string
          commission_rate?: number
          created_at?: string
          currency?: string
          current_price?: number
          ends_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
          start_price?: number
          starts_at?: string
          status?: Database["public"]["Enums"]["auction_status"]
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at: string
          id: string
        }
        Insert: {
          amount: number
          auction_id: string
          bidder_id: string
          created_at?: string
          id?: string
        }
        Update: {
          amount?: number
          auction_id?: string
          bidder_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          icon: string | null
          id: string
          name_ar: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          icon?: string | null
          id?: string
          name_ar: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          icon?: string | null
          id?: string
          name_ar?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimals: number
          is_active: boolean
          name_ar: string
          name_en: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          decimals?: number
          is_active?: boolean
          name_ar: string
          name_en: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          decimals?: number
          is_active?: boolean
          name_ar?: string
          name_en?: string
          symbol?: string
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          base_code: string
          fetched_at: string
          id: string
          quote_code: string
          rate: number
        }
        Insert: {
          base_code: string
          fetched_at?: string
          id?: string
          quote_code: string
          rate: number
        }
        Update: {
          base_code?: string
          fetched_at?: string
          id?: string
          quote_code?: string
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_base_code_fkey"
            columns: ["base_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_quote_code_fkey"
            columns: ["quote_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_documents: {
        Row: {
          admin_note: string | null
          created_at: string
          doc_type: string
          file_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          doc_type: string
          file_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          doc_type?: string
          file_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      listing_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          approval_status: string
          category_id: string
          city: string | null
          commission_exempt: boolean
          country_code: string | null
          created_at: string
          currency: string
          description: string
          id: string
          images: string[]
          price: number
          region_id: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          approval_status?: string
          category_id: string
          city?: string | null
          commission_exempt?: boolean
          country_code?: string | null
          created_at?: string
          currency?: string
          description: string
          id?: string
          images?: string[]
          price?: number
          region_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          approval_status?: string
          category_id?: string
          city?: string | null
          commission_exempt?: boolean
          country_code?: string | null
          created_at?: string
          currency?: string
          description?: string
          id?: string
          images?: string[]
          price?: number
          region_id?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "listings_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_deposits: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          gateway: string
          id: string
          proof_url: string | null
          reference: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string
          currency: string
          gateway: string
          id?: string
          proof_url?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          gateway?: string
          id?: string
          proof_url?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      plaza_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          commission_exempt: boolean
          country_code: string | null
          created_at: string
          free_listings_remaining: number
          free_listings_reset_at: string
          full_name: string | null
          id: string
          kyc_status: string
          phone: string | null
          preferred_currency: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          commission_exempt?: boolean
          country_code?: string | null
          created_at?: string
          free_listings_remaining?: number
          free_listings_reset_at?: string
          full_name?: string | null
          id: string
          kyc_status?: string
          phone?: string | null
          preferred_currency?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          commission_exempt?: boolean
          country_code?: string | null
          created_at?: string
          free_listings_remaining?: number
          free_listings_reset_at?: string
          full_name?: string | null
          id?: string
          kyc_status?: string
          phone?: string | null
          preferred_currency?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_preferred_currency_fkey"
            columns: ["preferred_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      regions: {
        Row: {
          country_code: string
          currency_code: string
          id: string
          is_active: boolean
          name_ar: string
          name_en: string
        }
        Insert: {
          country_code: string
          currency_code: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_en: string
        }
        Update: {
          country_code?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_en?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          auction_id: string | null
          buyer_id: string
          commission_amount: number
          commission_rate: number
          created_at: string
          currency: string
          id: string
          listing_id: string | null
          notes: string | null
          seller_id: string
          status: Database["public"]["Enums"]["tx_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          auction_id?: string | null
          buyer_id: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency: string
          id?: string
          listing_id?: string | null
          notes?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["tx_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          auction_id?: string | null
          buyer_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          listing_id?: string | null
          notes?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["tx_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          idempotency_key: string | null
          kind: Database["public"]["Enums"]["wallet_tx_kind"]
          note: string | null
          ref_id: string | null
          ref_table: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency: string
          id?: string
          idempotency_key?: string | null
          kind: Database["public"]["Enums"]["wallet_tx_kind"]
          note?: string | null
          ref_id?: string | null
          ref_table?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          idempotency_key?: string | null
          kind?: Database["public"]["Enums"]["wallet_tx_kind"]
          note?: string | null
          ref_id?: string | null
          ref_table?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          locked_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency: string
          id?: string
          locked_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          locked_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_currency_fkey"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_open_deal_chat: {
        Args: { _buyer: string; _listing: string; _seller: string }
        Returns: boolean
      }
      close_expired_auctions: { Args: never; Returns: number }
      confirm_manual_deposit: { Args: { _deposit_id: string }; Returns: string }
      finalize_auction: { Args: { _auction_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conv: string; _user: string }
        Returns: boolean
      }
      place_bid: {
        Args: { _amount: number; _auction_id: string }
        Returns: string
      }
      refund_escrow_funds: {
        Args: { _reason?: string; _tx_id: string }
        Returns: string
      }
      release_escrow_funds: { Args: { _tx_id: string }; Returns: string }
      review_kyc: {
        Args: { _approve: boolean; _doc_id: string; _note?: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      auction_status: "scheduled" | "active" | "ended" | "cancelled"
      listing_status: "draft" | "active" | "sold" | "archived"
      tx_status:
        | "pending"
        | "funded"
        | "released"
        | "refunded"
        | "disputed"
        | "cancelled"
      wallet_tx_kind:
        | "deposit"
        | "withdrawal"
        | "hold"
        | "release"
        | "refund"
        | "commission"
        | "transfer_in"
        | "transfer_out"
        | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      auction_status: ["scheduled", "active", "ended", "cancelled"],
      listing_status: ["draft", "active", "sold", "archived"],
      tx_status: [
        "pending",
        "funded",
        "released",
        "refunded",
        "disputed",
        "cancelled",
      ],
      wallet_tx_kind: [
        "deposit",
        "withdrawal",
        "hold",
        "release",
        "refund",
        "commission",
        "transfer_in",
        "transfer_out",
        "adjustment",
      ],
    },
  },
} as const
