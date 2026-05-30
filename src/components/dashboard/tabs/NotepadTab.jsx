import React, { useState, useEffect } from "react";
import {
  Box, Grid, Paper, TextField, Button, List, ListItem, ListItemButton,
  ListItemText, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, CircularProgress, Alert, Chip, Stack,
} from "@mui/material";
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import {
  getNotepadCategories,
  createNotepadCategory,
  addNoteToCategory,
  updateNote,
  deleteNote,
  deleteNotepadCategory,
} from "../../../firebase/firestore";

export default function NotepadTab({ barber, brandColor, profile }) {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newNoteText, setNewNoteText] = useState("");
  const [editingNote, setEditingNote] = useState(null);
  const [editText, setEditText] = useState("");
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [saveMessage, setSaveMessage] = useState(null);

  useEffect(() => {
    loadCategories();
  }, [barber?.uid]);

  const loadCategories = async () => {
    if (!barber?.uid) return;
    setLoading(true);
    try {
      const cats = await getNotepadCategories(barber.uid);
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0].id);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
      setSaveMessage({ type: "error", text: "Failed to load notepad" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !barber?.uid) return;
    try {
      await createNotepadCategory(barber.uid, newCategoryName);
      setNewCategoryName("");
      setNewCategoryDialog(false);
      await loadCategories();
      setSaveMessage({ type: "success", text: "Category created" });
    } catch (err) {
      console.error("Error creating category:", err);
      setSaveMessage({ type: "error", text: "Failed to create category" });
    }
  };

  const handleAddNote = async () => {
    if (!newNoteText.trim() || !selectedCategory || !barber?.uid) return;
    try {
      await addNoteToCategory(barber.uid, selectedCategory, newNoteText);
      setNewNoteText("");
      await loadCategories();
      setSaveMessage({ type: "success", text: "Note added" });
    } catch (err) {
      console.error("Error adding note:", err);
      setSaveMessage({ type: "error", text: "Failed to add note" });
    }
  };

  const handleUpdateNote = async () => {
    if (!editText.trim() || !selectedCategory || !editingNote || !barber?.uid) return;
    try {
      await updateNote(barber.uid, selectedCategory, editingNote.id, editText);
      setEditingNote(null);
      setEditText("");
      await loadCategories();
      setSaveMessage({ type: "success", text: "Note updated" });
    } catch (err) {
      console.error("Error updating note:", err);
      setSaveMessage({ type: "error", text: "Failed to update note" });
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!selectedCategory || !barber?.uid) return;
    try {
      await deleteNote(barber.uid, selectedCategory, noteId);
      await loadCategories();
      setSaveMessage({ type: "success", text: "Note deleted" });
    } catch (err) {
      console.error("Error deleting note:", err);
      setSaveMessage({ type: "error", text: "Failed to delete note" });
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!barber?.uid) return;
    try {
      await deleteNotepadCategory(barber.uid, categoryId);
      if (selectedCategory === categoryId) {
        setSelectedCategory(null);
      }
      await loadCategories();
      setSaveMessage({ type: "success", text: "Category deleted" });
    } catch (err) {
      console.error("Error deleting category:", err);
      setSaveMessage({ type: "error", text: "Failed to delete category" });
    }
  };

  const currentCategory = categories.find((c) => c.id === selectedCategory);
  const notes = currentCategory?.notes || [];

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress sx={{ color: brandColor }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
          Notepad
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Organize your notes by category. Keep track of follow-ups, ideas, client info, and more.
        </Typography>

        {saveMessage && (
          <Alert
            severity={saveMessage.type}
            onClose={() => setSaveMessage(null)}
            sx={{ mb: 2 }}
          >
            {saveMessage.text}
          </Alert>
        )}
      </Box>

      <Grid container spacing={3}>
        {/* Left: Categories Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2, borderRadius: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Categories
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setNewCategoryDialog(true)}
                sx={{ color: brandColor }}
              >
                Add
              </Button>
            </Box>

            {categories.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                No categories yet. Create one to get started.
              </Typography>
            ) : (
              <List sx={{ p: 0 }}>
                {categories.map((category) => (
                  <ListItem key={category.id} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      selected={selectedCategory === category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      sx={{
                        borderRadius: 1,
                        bgcolor: selectedCategory === category.id ? `${brandColor}15` : "transparent",
                        borderLeft: selectedCategory === category.id ? `3px solid ${brandColor}` : "none",
                        "&:hover": { bgcolor: `${brandColor}10` },
                      }}
                    >
                      <ListItemText
                        primary={category.name}
                        secondary={`${category.notes?.length || 0} notes`}
                        primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
                        secondaryTypographyProps={{ variant: "caption" }}
                      />
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(category.id);
                        }}
                        sx={{ ml: 1 }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Right: Notes View */}
        <Grid item xs={12} md={9}>
          {!selectedCategory ? (
            <Paper sx={{ p: 4, textAlign: "center", bgcolor: "rgba(255,255,255,0.04)" }}>
              <Typography color="text.secondary">Select a category or create a new one</Typography>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              {/* Add Note Section */}
              <Box sx={{ mb: 3, pb: 3, borderBottom: "1px solid #e0e0e0" }}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Add a new note..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ mb: 1 }}
                />
                <Button
                  variant="contained"
                  onClick={handleAddNote}
                  disabled={!newNoteText.trim()}
                  sx={{
                    bgcolor: brandColor,
                    "&:hover": { bgcolor: brandColor, opacity: 0.9 },
                  }}
                >
                  Add Note
                </Button>
              </Box>

              {/* Notes List */}
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2 }}>
                  Notes ({notes.length})
                </Typography>

                {notes.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
                    No notes in this category yet
                  </Typography>
                ) : (
                  <Stack spacing={2}>
                    {notes.map((note) => (
                      <Paper
                        key={note.id}
                        sx={{
                          p: 2,
                          bgcolor: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: 1,
                        }}
                      >
                        {editingNote?.id === note.id ? (
                          <>
                            <TextField
                              fullWidth
                              multiline
                              rows={3}
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              variant="outlined"
                              size="small"
                              sx={{ mb: 1 }}
                            />
                            <Stack direction="row" spacing={1}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={handleUpdateNote}
                                sx={{
                                  bgcolor: brandColor,
                                  "&:hover": { bgcolor: brandColor, opacity: 0.9 },
                                }}
                              >
                                Save
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                  setEditingNote(null);
                                  setEditText("");
                                }}
                              >
                                Cancel
                              </Button>
                            </Stack>
                          </>
                        ) : (
                          <>
                            <Typography variant="body2" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>
                              {note.text}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ flex: 1 }}
                              >
                                {new Date(note.createdAt).toLocaleDateString("en-GB", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingNote(note);
                                  setEditText(note.text);
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteNote(note.id)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Stack>
                          </>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Create Category Dialog */}
      <Dialog open={newCategoryDialog} onClose={() => setNewCategoryDialog(false)}>
        <DialogTitle>Create New Category</DialogTitle>
        <DialogContent sx={{ pt: 2, minWidth: 400 }}>
          <TextField
            fullWidth
            label="Category name"
            placeholder="e.g., Follow-ups, Ideas, Client Info..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleCreateCategory();
              }
            }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateCategory}
            variant="contained"
            sx={{ bgcolor: brandColor, "&:hover": { bgcolor: brandColor, opacity: 0.9 } }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
