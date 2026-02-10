"use client";

import { useState } from "react";
import { deleteDog } from "@/lib/api";
import type { DogProfile, TrackPoint } from "@/lib/types";
import AddDogModal from "@/components/AddDogModal";

interface DogListProps {
  dogs: DogProfile[];
  positions: Record<string, TrackPoint>;
  onDogAdded: (dog: DogProfile) => void;
  onDogDeleted: (id: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function DogList({
  dogs,
  positions,
  onDogAdded,
  onDogDeleted,
}: DogListProps) {
  const [showModal, setShowModal] = useState(false);

  const handleDelete = async (id: string) => {
    try {
      await deleteDog(id);
      onDogDeleted(id);
    } catch {
      // silently ignore for now
    }
  };

  return (
    <>
      <section className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Dogs
          </h2>
          <button
            onClick={() => setShowModal(true)}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded text-lg leading-none"
            title="Add dog"
          >
            +
          </button>
        </div>
        {dogs.length === 0 && (
          <p className="text-sm text-gray-400">No dogs registered</p>
        )}
        <ul className="space-y-2">
          {dogs.map((dog) => {
            const tp = dog.device_id ? positions[dog.device_id] : undefined;
            return (
              <li
                key={dog.id}
                className="flex items-center justify-between text-sm group"
              >
                <span className="font-medium text-gray-800">{dog.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs">
                    {tp ? timeAgo(tp.received_at) : "no signal"}
                  </span>
                  <button
                    onClick={() => handleDelete(dog.id)}
                    className="text-gray-300 hover:text-red-500 text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove dog"
                  >
                    &times;
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {showModal && (
        <AddDogModal
          onClose={() => setShowModal(false)}
          onDogAdded={onDogAdded}
        />
      )}
    </>
  );
}
