//components\invoice\create-group-modal.tsx
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

type CreateGroupModalProps = {
  isOpen: boolean;
  onClose: () => void;
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

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const supabase = createClient();
  const [groupName, setGroupName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0].value);
  const [tagName, setTagName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create the group
      const { data: newGroup, error: groupError } = await supabase
        .from("tag_groups")
        .insert({
          name: groupName.trim(),
          color: selectedColor,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // If a tag name is provided, create the tag and add it to the group
      if (tagName.trim() && newGroup) {
        const { data: newTag, error: tagError } = await supabase
          .from("tags")
          .insert({
            name: tagName.trim(),
            color: selectedColor,
          })
          .select()
          .single();

        if (tagError) throw tagError;

        // Add tag to group
        if (newTag) {
          const { error: membershipError } = await supabase
            .from("tag_group_members")
            .insert({
              tag_id: newTag.id,
              group_id: newGroup.id,
            });

          if (membershipError) throw membershipError;
        }
      }

      // Reset and close
      setGroupName("");
      setTagName("");
      setSelectedColor(COLORS[0].value);
      onClose();
    } catch (err: any) {
      console.error("Error creating group:", err);
      if (err.code === "23505") {
        setError("A group or tag with this name already exists");
      } else {
        setError("Failed to create group. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110]">
      <div className="bg-card rounded-lg shadow-lg w-full max-w-md">
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

        <div className="p-6 space-y-6">
          <h2 className="text-xl font-semibold">Create new group</h2>

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
              {error}
            </div>
          )}

          <div className="bg-muted/50 rounded-lg p-4 space-y-4">
            <div>
              <Label htmlFor="groupName">Group name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="mt-1"
                autoFocus
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

            <Button
              onClick={handleSubmit}
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={loading || !groupName.trim()}
            >
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Add tags to this group</h3>

            <div>
              <Label htmlFor="tagName">Tag name</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="tagName"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="Enter tag name"
                  className="flex-1"
                />
                <Button variant="outline" disabled={!groupName.trim() || !tagName.trim()}>
                  Add
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Put similar tags in the same group to get better reports.
              </p>
              <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                <ChevronLeft className="h-3 w-3 rotate-180" />
                Show me examples of groups
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}