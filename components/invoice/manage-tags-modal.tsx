//components\invoice\manage-tags-modal.tsx
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase-client";

import CreateGroupModal from "./create-group-modal";
import CreateTagModal from "./create-tags-modal";

type Tag = {
  id: string;
  name: string;
  color: string;
  invoice_count: number;
  group_id?: string;
  group_name?: string;
};

type TagGroup = {
  id: string;
  name: string;
  color: string;
  tags: Tag[];
};

type ManageTagsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onTagSelect?: (tagId: string) => void;
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

export default function ManageTagsModal({ isOpen, onClose, onTagSelect }: ManageTagsModalProps) {
  const supabase = createClient();
  const [tags, setTags] = useState<Tag[]>([]);
  const [groups, setGroups] = useState<TagGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Edit states
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchTagsAndGroups();
    }
  }, [isOpen]);

  const fetchTagsAndGroups = async () => {
    setLoading(true);
    try {
      // Fetch all tags with invoice count
      const { data: tagsData, error: tagsError } = await supabase
        .from("tags")
        .select(`
          id,
          name,
          color,
          invoice_tags(count)
        `)
        .order("name");

      if (tagsError) throw tagsError;

      // Fetch all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from("tag_groups")
        .select(`
          id,
          name,
          color
        `)
        .order("name");

      if (groupsError) throw groupsError;

      // Fetch group memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("tag_group_members")
        .select(`
          tag_id,
          group_id,
          tag_groups(name)
        `);

      if (membershipsError) throw membershipsError;

      // Process tags with invoice counts
      const processedTags = tagsData?.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        invoice_count: tag.invoice_tags?.[0]?.count || 0,
      })) || [];

      // Create a map of tag_id to group info
      const tagGroupMap = new Map();
      membershipsData?.forEach((membership: any) => {
        tagGroupMap.set(membership.tag_id, {
          group_id: membership.group_id,
          group_name: membership.tag_groups?.name,
        });
      });

      // Add group info to tags
      const tagsWithGroups = processedTags.map((tag: Tag) => ({
        ...tag,
        ...tagGroupMap.get(tag.id),
      }));

      // Organize tags by groups
      const groupedTags = (groupsData || []).map((group: any) => ({
        ...group,
        tags: tagsWithGroups.filter((tag: Tag) => tag.group_id === group.id),
      }));

      // Get ungrouped tags
      const ungroupedTags = tagsWithGroups.filter((tag: Tag) => !tag.group_id);

      setTags(ungroupedTags);
      setGroups(groupedTags);
    } catch (error) {
      console.error("Error fetching tags:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const startEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
  };

  const startEditGroup = (group: TagGroup) => {
    setEditingGroup(group);
    setEditName(group.name);
    setEditColor(group.color);
  };

  const saveTagEdit = async () => {
    if (!editingTag || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from("tags")
        .update({
          name: editName.trim(),
          color: editColor,
        })
        .eq("id", editingTag.id);

      if (error) throw error;

      setEditingTag(null);
      setEditName("");
      setEditColor("");
      fetchTagsAndGroups();
    } catch (error) {
      console.error("Error updating tag:", error);
      alert("Failed to update tag");
    }
  };

  const saveGroupEdit = async () => {
    if (!editingGroup || !editName.trim()) return;

    try {
      const { error } = await supabase
        .from("tag_groups")
        .update({
          name: editName.trim(),
          color: editColor,
        })
        .eq("id", editingGroup.id);

      if (error) throw error;

      setEditingGroup(null);
      setEditName("");
      setEditColor("");
      fetchTagsAndGroups();
    } catch (error) {
      console.error("Error updating group:", error);
      alert("Failed to update group");
    }
  };

  const deleteTag = async (tagId: string) => {
    if (!confirm("Are you sure you want to delete this tag?")) return;

    try {
      // First delete from tag_group_members
      await supabase.from("tag_group_members").delete().eq("tag_id", tagId);
      
      // Then delete from invoice_tags
      await supabase.from("invoice_tags").delete().eq("tag_id", tagId);
      
      // Finally delete the tag
      const { error } = await supabase.from("tags").delete().eq("id", tagId);

      if (error) throw error;

      fetchTagsAndGroups();
    } catch (error) {
      console.error("Error deleting tag:", error);
      alert("Failed to delete tag");
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this group? Tags in this group will not be deleted.")) return;

    try {
      // First delete from tag_group_members
      await supabase.from("tag_group_members").delete().eq("group_id", groupId);
      
      // Then delete the group
      const { error } = await supabase.from("tag_groups").delete().eq("id", groupId);

      if (error) throw error;

      fetchTagsAndGroups();
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group");
    }
  };

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      tags: group.tags.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter((group) => group.tags.length > 0 || group.name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] overflow-hidden">
        <div className="bg-card rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold">Manage your tags</h2>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 p-4 border-b">
            <Button variant="outline" className="flex-1" onClick={() => setShowCreateTag(true)}>
              Create tag
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setShowCreateGroup(true)}>
              Create group
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Tags List */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4">
              {loading ? (
                <div className="text-center text-muted-foreground py-8">Loading tags...</div>
              ) : (
                <>
                  {/* Groups */}
                  {filteredGroups.map((group) => (
                    <div key={group.id} className="mb-4">
                      {editingGroup?.id === group.id ? (
                        <div className="p-3 bg-muted/50 rounded space-y-3">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Group name"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            {COLORS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                onClick={() => setEditColor(color.value)}
                                className={`w-6 h-6 rounded-full border-2 ${
                                  editColor === color.value ? "border-foreground" : "border-transparent"
                                }`}
                                style={{ backgroundColor: color.value }}
                                title={color.label}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveGroupEdit} className="flex-1">
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingGroup(null);
                                setEditName("");
                                setEditColor("");
                              }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div
                            onClick={() => toggleGroup(group.id)}
                            className="flex items-center gap-2 w-full py-2 px-3 hover:bg-muted/50 rounded font-medium group cursor-pointer"
                          >
                            {expandedGroups.has(group.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            <span className="text-sm flex-1 text-left">{group.name}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditGroup(group);
                                }}
                                className="p-1 hover:bg-muted rounded"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteGroup(group.id);
                                }}
                                className="p-1 hover:bg-destructive/10 rounded"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </button>
                            </div>
                          </div>

                          {expandedGroups.has(group.id) && (
                            <div className="ml-6 space-y-1 mt-1">
                              {group.tags.map((tag) => (
                                <div key={tag.id}>
                                  {editingTag?.id === tag.id ? (
                                    <div className="p-2 bg-muted/50 rounded space-y-2">
                                      <Input
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        placeholder="Tag name"
                                        autoFocus
                                        className="text-sm"
                                      />
                                      <div className="flex gap-1">
                                        {COLORS.map((color) => (
                                          <button
                                            key={color.value}
                                            type="button"
                                            onClick={() => setEditColor(color.value)}
                                            className={`w-5 h-5 rounded-full border ${
                                              editColor === color.value ? "border-foreground" : "border-transparent"
                                            }`}
                                            style={{ backgroundColor: color.value }}
                                            title={color.label}
                                          />
                                        ))}
                                      </div>
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={saveTagEdit} className="flex-1 text-xs h-7">
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setEditingTag(null);
                                            setEditName("");
                                            setEditColor("");
                                          }}
                                          className="flex-1 text-xs h-7"
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded cursor-pointer group"
                                      onClick={() => onTagSelect?.(tag.id)}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-3 h-3 rounded-full"
                                          style={{ backgroundColor: tag.color }}
                                        />
                                        <span className="text-sm">
                                          {tag.name} ({tag.invoice_count})
                                        </span>
                                      </div>
                                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditTag(tag);
                                          }}
                                          className="p-1 hover:bg-muted rounded"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteTag(tag.id);
                                          }}
                                          className="p-1 hover:bg-destructive/10 rounded"
                                        >
                                          <Trash2 className="h-3 w-3 text-destructive" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {/* Ungrouped Tags */}
                  {filteredTags.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 px-3">Tags</h3>
                      <div className="space-y-1">
                        {filteredTags.map((tag) => (
                          <div key={tag.id}>
                            {editingTag?.id === tag.id ? (
                              <div className="p-3 bg-muted/50 rounded space-y-3">
                                <Input
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  placeholder="Tag name"
                                  autoFocus
                                />
                                <div className="flex gap-2">
                                  {COLORS.map((color) => (
                                    <button
                                      key={color.value}
                                      type="button"
                                      onClick={() => setEditColor(color.value)}
                                      className={`w-6 h-6 rounded-full border-2 ${
                                        editColor === color.value ? "border-foreground" : "border-transparent"
                                      }`}
                                      style={{ backgroundColor: color.value }}
                                      title={color.label}
                                    />
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={saveTagEdit} className="flex-1">
                                    Save
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingTag(null);
                                      setEditName("");
                                      setEditColor("");
                                    }}
                                    className="flex-1"
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded cursor-pointer group"
                                onClick={() => onTagSelect?.(tag.id)}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: tag.color }}
                                  />
                                  <span className="text-sm">
                                    {tag.name} ({tag.invoice_count})
                                  </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditTag(tag);
                                    }}
                                    className="p-1 hover:bg-muted rounded"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteTag(tag.id);
                                    }}
                                    className="p-1 hover:bg-destructive/10 rounded"
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTags.length === 0 && filteredGroups.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      {searchQuery ? "No tags found" : "No tags yet. Create your first tag!"}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Tag Modal */}
      <CreateTagModal
        isOpen={showCreateTag}
        onClose={() => {
          setShowCreateTag(false);
          fetchTagsAndGroups();
        }}
        groups={groups}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => {
          setShowCreateGroup(false);
          fetchTagsAndGroups();
        }}
      />
    </>
  );
}