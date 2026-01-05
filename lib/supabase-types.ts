//lib\supabase-types.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          type: "asset" | "liability" | "equity" | "income" | "expense"
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          type: "asset" | "liability" | "equity" | "income" | "expense"
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: "asset" | "liability" | "equity" | "income" | "expense"
          description?: string | null
          created_at?: string | null
        }
      }

      bank_transactions: {
        Row: {
          id: string
          account_id: string | null
          date: string | null
          description: string | null
          amount: number
          type: "deposit" | "withdrawal" | null
          reference_no: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          account_id?: string | null
          date?: string | null
          description?: string | null
          amount: number
          type?: "deposit" | "withdrawal" | null
          reference_no?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string | null
          date?: string | null
          description?: string | null
          amount?: number
          type?: "deposit" | "withdrawal" | null
          reference_no?: string | null
          created_at?: string | null
        }
      }

      bills: {
        Row: {
          id: string
          vendor_id: string | null
          bill_no: string
          bill_date: string | null
          due_date: string | null
          status: "draft" | "unpaid" | "paid" | "partial" | "overdue"
          subtotal: number | null
          tax_total: number | null
          total_amount: number | null
          balance_due: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id?: string | null
          bill_no: string
          bill_date?: string | null
          due_date?: string | null
          status?: "draft" | "unpaid" | "paid" | "partial" | "overdue"
          subtotal?: number | null
          tax_total?: number | null
          total_amount?: number | null
          balance_due?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string | null
          bill_no?: string
          bill_date?: string | null
          due_date?: string | null
          status?: "draft" | "unpaid" | "paid" | "partial" | "overdue"
          subtotal?: number | null
          tax_total?: number | null
          total_amount?: number | null
          balance_due?: number | null
          notes?: string | null
          created_at?: string | null
        }
      }

      bill_items: {
        Row: {
          id: string
          bill_id: string | null
          description: string
          quantity: number
          unit_cost: number
          tax_rate: number | null
          line_total: number | null
          tax_amount: number | null
        }
        Insert: {
          id?: string
          bill_id?: string | null
          description: string
          quantity?: number
          unit_cost?: number
          tax_rate?: number | null
          line_total?: number | null
          tax_amount?: number | null
        }
        Update: {
          id?: string
          bill_id?: string | null
          description?: string
          quantity?: number
          unit_cost?: number
          tax_rate?: number | null
          line_total?: number | null
          tax_amount?: number | null
        }
      }

      customers: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          billing_address: string | null
          shipping_address: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          billing_address?: string | null
          shipping_address?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          billing_address?: string | null
          shipping_address?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }

      expenses: {
        Row: {
          id: string
          vendor_id: string | null
          category: string | null
          amount: number
          payment_method: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          vendor_id?: string | null
          category?: string | null
          amount: number
          payment_method?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          vendor_id?: string | null
          category?: string | null
          amount?: number
          payment_method?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }

      invoices: {
        Row: {
          id: string
          invoice_no: string
          customer_id: string | null
          issue_date: string | null
          due_date: string | null
          status: "draft" | "sent" | "paid" | "partial" | "overdue"
          subtotal: number | null
          tax_total: number | null
          total_amount: number | null
          balance_due: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          invoice_no: string
          customer_id?: string | null
          issue_date?: string | null
          due_date?: string | null
          status?: "draft" | "sent" | "paid" | "partial" | "overdue"
          subtotal?: number | null
          tax_total?: number | null
          total_amount?: number | null
          balance_due?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          invoice_no?: string
          customer_id?: string | null
          issue_date?: string | null
          due_date?: string | null
          status?: "draft" | "sent" | "paid" | "partial" | "overdue"
          subtotal?: number | null
          tax_total?: number | null
          total_amount?: number | null
          balance_due?: number | null
          notes?: string | null
          created_at?: string | null
        }
      }

      invoice_items: {
        Row: {
          id: string
          invoice_id: string | null
          description: string
          quantity: number
          unit_price: number
          tax_rate: number | null
          line_total: number | null
          tax_amount: number | null
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          description: string
          quantity?: number
          unit_price?: number
          tax_rate?: number | null
          line_total?: number | null
          tax_amount?: number | null
        }
        Update: {
          id?: string
          invoice_id?: string | null
          description?: string
          quantity?: number
          unit_price?: number
          tax_rate?: number | null
          line_total?: number | null
          tax_amount?: number | null
        }
      }

      journal_entries: {
        Row: {
          id: string
          reference_id: string | null
          reference_type: "invoice" | "payment" | "bill" | "expense" | null
          entry_date: string | null
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          reference_id?: string | null
          reference_type?: "invoice" | "payment" | "bill" | "expense" | null
          entry_date?: string | null
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          reference_id?: string | null
          reference_type?: "invoice" | "payment" | "bill" | "expense" | null
          entry_date?: string | null
          description?: string | null
          created_at?: string | null
        }
      }

      journal_lines: {
        Row: {
          id: string
          journal_id: string | null
          account_id: string | null
          debit: number | null
          credit: number | null
        }
        Insert: {
          id?: string
          journal_id?: string | null
          account_id?: string | null
          debit?: number | null
          credit?: number | null
        }
        Update: {
          id?: string
          journal_id?: string | null
          account_id?: string | null
          debit?: number | null
          credit?: number | null
        }
      }

      payments: {
        Row: {
          id: string
          invoice_id: string | null
          invoice_no: string | null
          amount: number
          payment_method: string | null
          payment_date: string | null
          reference_no: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          amount: number
          payment_method?: string | null
          payment_date?: string | null
          reference_no?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string | null
          amount?: number
          payment_method?: string | null
          payment_date?: string | null
          reference_no?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }

      vendors: {
        Row: {
          id: string
          name: string
          email: string | null
          phone: string | null
          address: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          phone?: string | null
          address?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
    }
  }
}
