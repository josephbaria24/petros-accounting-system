//components\invoice\manage-codes-modal.tsx
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

type Code = {
  id: string;
  code: string;
  name: string;
  description?: string;
};

type ManageCodesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};


export default function ManageCodesModal({ isOpen, onClose, onUpdated }: ManageCodesModalProps) {
  const supabase = createClient();
  const [codes, setCodes] = useState<Code[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<Code | null>(null);
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchCodes();
    }
  }, [isOpen]);

  const fetchCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("codes")
        .select("*")
        .order("code");

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error fetching codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formCode.trim() || !formName.trim()) {
      alert("Code and name are required");
      return;
    }

    try {
      if (editingCode) {
        // Update
        const { error } = await supabase
          .from("codes")
          .update({
            code: formCode.trim(),
            name: formName.trim(),
            description: formDescription.trim() || null,
          })
          .eq("id", editingCode.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from("codes")
          .insert({
            code: formCode.trim(),
            name: formName.trim(),
            description: formDescription.trim() || null,
          });

        if (error) throw error;
      }

      resetForm();
      fetchCodes();
      onUpdated?.();
    } catch (error: any) {
      console.error("Error saving code:", error);
      if (error.code === "23505") {
        alert("A code with this value already exists");
      } else {
        alert("Failed to save code");
      }
    }
  };

  const handleEdit = (code: Code) => {
    setEditingCode(code);
    setFormCode(code.code);
    setFormName(code.name);
    setFormDescription(code.description || "");
    setShowForm(true);
  };

  const handleDelete = async (codeId: string) => {
    if (!confirm("Are you sure? This will remove the code from all invoices.")) return;

    try {
      const { error } = await supabase
        .from("codes")
        .delete()
        .eq("id", codeId);

      if (error) throw error;
      fetchCodes();
      onUpdated?.();
    } catch (error) {
      console.error("Error deleting code:", error);
      alert("Failed to delete code");
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCode(null);
    setFormCode("");
    setFormName("");
    setFormDescription("");
  };

  const filteredCodes = codes.filter(code =>
    code.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    code.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">Manage Project/Training Codes</h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Create Button */}
        {!showForm && (
          <div className="p-4 border-b">
            <Button onClick={() => setShowForm(true)} className="w-full">
              Create New Code
            </Button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="p-4 border-b bg-muted/20 space-y-3">
            <h3 className="font-semibold">{editingCode ? "Edit Code" : "New Code"}</h3>
            <div>
              <label className="text-sm font-medium">Code *</label>
              <Input
                value={formCode}
                onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                placeholder="e.g., BOSHSO2"
                maxLength={20}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Basic Occupational Safety Training - Batch 2"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSubmit} className="flex-1">
                {editingCode ? "Update" : "Create"}
              </Button>
              <Button onClick={resetForm} variant="outline" className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="p-4 border-b">
          <Input
            type="text"
            placeholder="Search codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Codes List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : filteredCodes.length > 0 ? (
            <div className="space-y-2">
              {filteredCodes.map((code) => (
                <div
                  key={code.id}
                  className="flex items-start justify-between p-3 border rounded hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-blue-600">{code.code}</div>
                    <div className="text-sm">{code.name}</div>
                    {code.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {code.description}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(code)}
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(code.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              {searchQuery ? "No codes found" : "No codes yet. Create your first code!"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}