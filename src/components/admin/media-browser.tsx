"use client";

import { FolderOpen, Search } from "lucide-react";
import * as React from "react";

import { EmptyState } from "@/components/admin/empty-state";
import { MediaCard, type MediaItem } from "@/components/admin/media-card";
import { MediaUploader } from "@/components/admin/media-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { listMediaAction } from "@/server/media/actions";

const FOLDERS = [
  { value: "", label: "Todas" },
  { value: "general", label: "General" },
  { value: "servicios", label: "Servicios" },
  { value: "blog", label: "Blog" },
  { value: "galeria", label: "Galería" },
  { value: "carrusel", label: "Carrusel" },
  { value: "perfil", label: "Perfil" },
];

export function MediaBrowser() {
  const [folder, setFolder] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [searchInput, setSearchInput] = React.useState("");
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [total, setTotal] = React.useState(0);

  const load = React.useCallback(async () => {
    setLoading(true);
    const result = await listMediaAction({
      folder: folder || undefined,
      search: search || undefined,
    });
    setItems(result.items as MediaItem[]);
    setTotal(result.total);
    setLoading(false);
  }, [folder, search]);

  React.useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setTotal((t) => t - 1);
  }

  function handleUpload() {
    load();
  }

  return (
    <div className="space-y-6">
      <MediaUploader folder={folder || "general"} onUploadComplete={handleUpload} />

      {/* Filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-on-surface-variant" />
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            className="h-10 rounded-lg border border-outline bg-surface-container-lowest px-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
          >
            {FOLDERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
            <Input
              type="search"
              placeholder="Buscar por nombre..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Buscar
          </Button>
        </form>
      </div>

      {/* Resultado */}
      <div className="flex items-center justify-between text-sm text-on-surface-variant">
        <span>
          {loading ? "Cargando..." : `${total} imagen${total === 1 ? "" : "es"}`}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No hay imágenes"
          description={
            search || folder
              ? "No se encontraron imágenes con esos filtros."
              : "Arrastra tu primera imagen arriba o haz click en el área de upload."
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}