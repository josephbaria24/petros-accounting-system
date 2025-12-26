//components\invoice\create-tags-modal.tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase-client";

type TagGroup = {
  id: string;
  name: string;
  color: string;
};

type CreateTagModalProps = {
  isOpen: boolean;
  onClose: () => void;
  groups: TagGroup[];
};

const COLORS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#10b981", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#84cc16", label: "Lime" },
];

export default function CreateTagModal({ isOpen, onClose, groups }: CreateTagModalProps) {
  const supabase = createClient();
  const [tagName, setTagName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!tagName.trim()) {
      setError("Tag name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create the tag
      const { data: newTag, error: tagError } = await supabase
        .from("tags")
        .insert({
          name: tagName.trim(),
          color: selectedColor,
        })
        .select()
        .single();

      if (tagError) throw tagError;

      // If a group is selected, add the tag to the group
      if (selectedGroup && selectedGroup !== "none" && newTag) {
        const { error: membershipError } = await supabase
          .from("tag_group_members")
          .insert({
            tag_id: newTag.id,
            group_id: selectedGroup,
          });

        if (membershipError) throw membershipError;
      }

      // Reset and close
      setTagName("");
      setSelectedGroup("");
      setSelectedColor(COLORS[0].value);
      onClose();
    } catch (err: any) {
      console.error("Error creating tag:", err);
      if (err.code === "23505") {
        setError("A tag with this name already exists");
      } else {
        setError("Failed to create tag. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150]">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md relative z-[151]">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b">
          <button
            onClick={onClose}
            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </button>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 ml-auto">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Create new tag</h2>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="tagName">Tag name</Label>
            <Input
              id="tagName"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Enter tag name"
              className="mt-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div>
            <Label htmlFor="color">Color</Label>
            <div className="flex gap-2 mt-2">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    selectedColor === color.value ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </div>

          <div className="relative z-[152]">
            <Label htmlFor="group">Group (optional)</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent className="z-[153]">
                <SelectItem value="none">No group</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={loading || !tagName.trim()}
            >
              {loading ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}