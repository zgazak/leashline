"use client";

import { useCallback, useEffect, useState } from "react";
import type { Api } from "@/lib/auth-api";
import type { Pack, PackMember } from "@/lib/types";

interface PackSettingsProps {
  api: Api;
  onClose: () => void;
}

export default function PackSettings({ api, onClose }: PackSettingsProps) {
  const [pack, setPack] = useState<Pack | null>(null);
  const [members, setMembers] = useState<PackMember[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getMyPack()
      .then(({ pack, members }) => {
        setPack(pack);
        setMembers(members);
      })
      .catch(() => setError("Failed to load pack info"))
      .finally(() => setLoading(false));
  }, [api]);

  const handleGenerateInvite = useCallback(async () => {
    try {
      const { code } = await api.createInvite();
      setInviteCode(code);
    } catch {
      setError("Failed to generate invite");
    }
  }, [api]);

  const handleRemoveMember = useCallback(
    async (userId: string) => {
      try {
        await api.removeMember(userId);
        setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      } catch {
        setError("Failed to remove member");
      }
    },
    [api],
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Pack Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : pack ? (
          <>
            <div>
              <p className="text-sm text-gray-500">Pack Name</p>
              <p className="font-medium">{pack.name}</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-500 mb-1">MQTT Topic Prefix</p>
              <code className="text-sm font-mono text-blue-700 break-all">
                {pack.mqtt_topic_prefix}/2/json/LongFast
              </code>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">
                Members ({members.length})
              </p>
              <ul className="space-y-2">
                {members.map((m) => (
                  <li
                    key={m.user_id}
                    className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded"
                  >
                    <span>
                      {m.user_id}
                      {m.role === "owner" && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          Owner
                        </span>
                      )}
                    </span>
                    {m.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(m.user_id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-4">
              <button
                onClick={handleGenerateInvite}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Generate Invite Code
              </button>
              {inviteCode && (
                <div className="mt-3 bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-600 mb-1">
                    Share this code (expires in 7 days)
                  </p>
                  <code className="text-lg font-mono font-bold text-green-800">
                    {inviteCode}
                  </code>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-sm">No pack found.</p>
        )}
      </div>
    </div>
  );
}
