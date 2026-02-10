"use client";

import { useState } from "react";
import { scanBLE, switchConnection } from "@/lib/api";
import type { BLEScanResult } from "@/lib/types";

interface ConnectionSwitcherProps {
  onClose: () => void;
}

type ConnType = "serial" | "tcp" | "ble" | "mqtt";

export default function ConnectionSwitcher({
  onClose,
}: ConnectionSwitcherProps) {
  const [connType, setConnType] = useState<ConnType>("serial");
  const [serialPort, setSerialPort] = useState("/dev/ttyUSB0");
  const [tcpHost, setTcpHost] = useState("localhost");
  const [tcpPort, setTcpPort] = useState("4403");
  const [bleAddress, setBleAddress] = useState("");
  const [brokerHost, setBrokerHost] = useState("localhost");
  const [brokerPort, setBrokerPort] = useState("1883");
  const [mqttUsername, setMqttUsername] = useState("");
  const [mqttPassword, setMqttPassword] = useState("");
  const [mqttTopic, setMqttTopic] = useState("msh/+/2/json/#");
  const [mqttTls, setMqttTls] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [bleDevices, setBleDevices] = useState<BLEScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    try {
      const results = await scanBLE();
      setBleDevices(results);
    } catch (e) {
      setError(`Scan failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setScanning(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await switchConnection({
        connection_type: connType,
        serial_port: serialPort,
        tcp_host: tcpHost,
        tcp_port: parseInt(tcpPort, 10),
        ble_address: bleAddress || undefined,
        broker_host: brokerHost,
        broker_port: parseInt(brokerPort, 10),
        mqtt_username: mqttUsername || undefined,
        mqtt_password: mqttPassword || undefined,
        mqtt_topic: mqttTopic,
        mqtt_tls: mqttTls,
      });
      onClose();
    } catch (e) {
      setError(`Connection failed: ${e instanceof Error ? e.message : e}`);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Switch Connection</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Connection type radio */}
        <div className="flex gap-4 mb-4">
          {(["serial", "tcp", "ble", "mqtt"] as const).map((t) => (
            <label key={t} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name="connType"
                value={t}
                checked={connType === t}
                onChange={() => setConnType(t)}
                className="accent-blue-600"
              />
              {t.toUpperCase()}
            </label>
          ))}
        </div>

        {/* Serial fields */}
        {connType === "serial" && (
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Serial Port</label>
            <input
              value={serialPort}
              onChange={(e) => setSerialPort(e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
            />
          </div>
        )}

        {/* TCP fields */}
        {connType === "tcp" && (
          <div className="mb-4 space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Host</label>
              <input
                value={tcpHost}
                onChange={(e) => setTcpHost(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Port</label>
              <input
                value={tcpPort}
                onChange={(e) => setTcpPort(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
        )}

        {/* BLE fields */}
        {connType === "ble" && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <label className="block text-xs text-gray-500">BLE Address</label>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                {scanning ? "Scanning..." : "Scan"}
              </button>
            </div>
            <input
              value={bleAddress}
              onChange={(e) => setBleAddress(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              className="w-full border border-gray-300 rounded px-2 py-1 text-sm mb-2"
            />
            {bleDevices.length > 0 && (
              <ul className="border border-gray-200 rounded max-h-32 overflow-y-auto">
                {bleDevices.map((d) => (
                  <li
                    key={d.address}
                    className="px-2 py-1 text-sm hover:bg-blue-50 cursor-pointer flex justify-between"
                    onClick={() => setBleAddress(d.address)}
                  >
                    <span>{d.name || d.address}</span>
                    {d.rssi != null && (
                      <span className="text-gray-400">{d.rssi} dBm</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* MQTT fields */}
        {connType === "mqtt" && (
          <div className="mb-4 space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Broker Host</label>
              <input
                value={brokerHost}
                onChange={(e) => setBrokerHost(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Broker Port</label>
              <input
                value={brokerPort}
                onChange={(e) => setBrokerPort(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Username</label>
              <input
                value={mqttUsername}
                onChange={(e) => setMqttUsername(e.target.value)}
                placeholder="(optional)"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Password</label>
              <input
                type="password"
                value={mqttPassword}
                onChange={(e) => setMqttPassword(e.target.value)}
                placeholder="(optional)"
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Topic</label>
              <input
                value={mqttTopic}
                onChange={(e) => setMqttTopic(e.target.value)}
                className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={mqttTls}
                onChange={(e) => setMqttTls(e.target.checked)}
                className="accent-blue-600"
              />
              Enable TLS
            </label>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
