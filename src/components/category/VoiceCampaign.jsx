import React, { useEffect, useState } from "react";
import { FaUsers, FaPaperPlane, FaLayerGroup, FaCalendarAlt } from "react-icons/fa";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { BASE } from "../api";

export default function VoiceCampaign() {

  const [numbers, setNumbers] = useState("");
  const [campaignName, setCampaignName] = useState(
    `${new Date().toLocaleDateString()}-${new Date().getHours()}:${new Date().getMinutes()}`
  );
  const [callerId, setCallerId] = useState("");
  const [callerIds, setCallerIds] = useState([]);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [selectedMediaId, setSelectedMediaId] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [callType, setCallType] = useState("2");
  const [voicePlan, setVoicePlan] = useState("2");
  const [retryAttempt, setRetryAttempt] = useState("0");
  const [retryDuration, setRetryDuration] = useState("0");

  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [showGroupPopup, setShowGroupPopup] = useState(false);
  const [showTestPopup, setShowTestPopup] = useState(false);
  const [showSchedulePopup, setShowSchedulePopup] = useState(false);

  const [testNumber, setTestNumber] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [fromRange, setFromRange] = useState(0);
  const [toRange, setToRange] = useState(0);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [testCallLoading, setTestCallLoading] = useState(false);

  // ── PREMIUM POPUP (replaces alert()) ──
  const [popup, setPopup] = useState(false);
  const [popupType, setPopupType] = useState("success"); // "success" | "error"
  const [popupTitle, setPopupTitle] = useState("");
  const [popupMsg, setPopupMsg] = useState("");
  const [popupStats, setPopupStats] = useState(null); // [[label, value], ...] optional grid

  const showPopup = (t, title, m, stats = null) => {
    setPopupType(t);
    setPopupTitle(title);
    setPopupMsg(m);
    setPopupStats(stats);
    setPopup(true);
  };

  const groups = [
    { name: "Demo Group", total: 150 },
    { name: "Customer Group", total: 350 },
  ];

  const userId = () => sessionStorage.getItem("user_id");

  // ==============================
  // NUMBER FORMATTING HELPERS
  // ==============================
  const formatNumbers = (raw) => {
    const cleaned = raw.replace(/[^\d,]/g, "");
    const parts = cleaned.split(",");
    const result = [];
    parts.forEach((part) => {
      if (part.length > 10) {
        for (let i = 0; i < part.length; i += 10) {
          result.push(part.slice(i, i + 10));
        }
      } else {
        result.push(part);
      }
    });
    return result.join(",");
  };

  const getValidNumbers = (raw) =>
    [...new Set(raw.split(",").map((n) => n.trim()).filter((n) => /^[6-9]\d{9}$/.test(n)))];

  const handleNumbersChange = (e) => {
    setNumbers(formatNumbers(e.target.value));
  };

  const handleNumbersBlur = () => {
    setNumbers(getValidNumbers(numbers).join(","));
  };

  // ==============================
  // LOAD ON MOUNT
  // ==============================
  useEffect(() => {
    loadMediaFiles();
    loadCallerIds();
  }, []);

  const loadMediaFiles = async () => {
    try {
      const res = await fetch(`${BASE}/get-media-files/?user_id=${userId()}&only_approved=true`);
      const data = await res.json();
      setMediaFiles(Array.isArray(data) ? data : []);
    } catch (err) { console.log("Media load error:", err); }
  };

  const loadCallerIds = async () => {
    try {
      const res = await fetch(`${BASE}/get-caller-ids/?user_id=${userId()}`);
      const data = await res.json();
      setCallerIds(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) {
        setCallerId(data[0].number);
      }
    } catch (err) { console.log("Caller ID load error:", err); }
  };

  // ==============================
  // CSV → NUMBERS
  // ==============================
  const handleFileUpload = () => {
    if (!uploadFile) { showPopup("error", "Error", "Please select a file"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const nums = lines.map(line => line.split(",")[0].trim()).filter(n => /^[6-9]\d{9}$/.test(n));
      if (nums.length > 0) {
        const merged = [...new Set(
          (numbers ? numbers.split(",").concat(nums) : nums)
            .map(n => n.trim())
            .filter(n => /^[6-9]\d{9}$/.test(n))
        )];
        setNumbers(merged.join(","));
        showPopup("success", "Loaded", `${nums.length} valid numbers loaded`);
        setShowUploadPopup(false);
      } else {
        showPopup("error", "Error", "No valid 10-digit numbers found in this file");
      }
    };
    reader.readAsText(uploadFile);
  };

  // ==============================
  // TEST CALL
  // ==============================
  const handleTestCall = async () => {
    if (!/^[6-9]\d{9}$/.test(testNumber)) { showPopup("error", "Error", "Enter a valid 10 digit number"); return; }
    if (!selectedMediaId) { showPopup("error", "Error", "Select Voice File"); return; }
    if (!callerId) { showPopup("error", "Error", "Select Caller ID"); return; }
    try {
      setTestCallLoading(true);
      const res = await fetch(`${BASE}/send-bulk-voice/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId(), numbers: [testNumber],
          media_file_id: selectedMediaId, caller_id: callerId,
          plan_id: voicePlan, call_type: callType,
          campaign_name: "Test Call",
          retry_attempt: retryAttempt, retry_duration: retryDuration,
        }),
      });
      const data = await res.json();
      setShowTestPopup(false);
      if (data.status === "done") {
        showPopup("success", "Test Call Sent!", `Test call dispatched to ${testNumber}`);
      } else {
        showPopup("error", "Failed", data.message || "Test call could not be sent");
      }
    } catch {
      showPopup("error", "Error", "Network error while sending test call");
    }
    setTestCallLoading(false);
  };

  // ==============================
  // SEND CAMPAIGN — no limit, all valid numbers go
  // ==============================
  const sendCampaign = async () => {
    if (loading) return;
    setLoading(true);
    setShowConfirm(false);

    const numberList = getValidNumbers(numbers);
    if (numberList.length === 0) { showPopup("error", "Error", "Please enter valid 10 digit numbers"); setLoading(false); return; }
    if (!selectedMediaId) { showPopup("error", "Error", "Please select a voice file"); setLoading(false); return; }
    if (!callerId) { showPopup("error", "Error", "Please select a caller ID"); setLoading(false); return; }

    try {
      const res = await fetch(`${BASE}/send-bulk-voice/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId(), numbers: numberList,
          media_file_id: selectedMediaId, caller_id: callerId,
          plan_id: voicePlan, call_type: callType,
          campaign_name: campaignName,
          retry_attempt: retryAttempt, retry_duration: retryDuration,
        }),
      });
      const data = await res.json();
if (data.status === "done") {

  showPopup(
    "success",
    "Campaign Sent! 🚀",
    "Your voice campaign has been dispatched successfully.",
    [
      ["Total", data.total],
      ["Success", data.success],
      ["Failed", data.failed],
      ["Invalid", data.invalid],
    ]
  );

  setNumbers("");
  setSelectedMediaId("");

} else if (data.status === "pending") {

  showPopup(
    "success",
    "Campaign Send Successfully",

    [

      ["Total Numbers", data.total],
      
      ["Status", "Pending"],
    ]
  );

  setNumbers("");
  setSelectedMediaId("");

} else {

  showPopup(
    "error",
    "Error",
    data.message || "Something went wrong"
  );
}
    } catch {
      showPopup("error", "Network Error", "Please check your connection and try again");
    }
    setLoading(false);
  };

  // ==============================
  // SCHEDULE CAMPAIGN — no limit
  // ==============================
  const handleSchedule = async () => {
    if (!scheduleDate || !scheduleTime) { showPopup("error", "Error", "Please select date and time"); return; }
    const numberList = getValidNumbers(numbers);
    if (numberList.length === 0) { showPopup("error", "Error", "Please enter valid 10 digit numbers"); return; }
    if (!selectedMediaId) { showPopup("error", "Error", "Please select a voice file"); return; }
    if (!callerId) { showPopup("error", "Error", "Please select a caller ID"); return; }

    try {
      setScheduleLoading(true);
      const res = await fetch(`${BASE}/schedule-campaign/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId(), numbers: numberList,
          media_file_id: selectedMediaId, caller_id: callerId,
          plan_id: voicePlan, call_type: callType,
          campaign_name: campaignName,
          scheduled_at: `${scheduleDate}T${scheduleTime}`,
          retry_attempt: retryAttempt, retry_duration: retryDuration,
        }),
      });
      const data = await res.json();
      if (data.status === "scheduled") {
        setShowSchedulePopup(false);
        showPopup(
          "success",
          "Campaign Scheduled! ✅",
          `Will run on ${scheduleDate} at ${scheduleTime}`,
          [["Total Numbers", data.total]]
        );
        setNumbers(""); setSelectedMediaId("");
      } else {
        showPopup("error", "Error", data.message || "Something went wrong");
      }
    } catch {
      showPopup("error", "Network Error", "Please check your connection and try again");
    }
    setScheduleLoading(false);
  };

  const validCount = getValidNumbers(numbers).length;

  // ==============================
  // RENDER
  // ==============================
  return (
    <div className="min-h-screen bg-[#f5f5f5] p-2">

      <div className="bg-white rounded-[22px] border border-[#ef7d9f] overflow-hidden shadow-md">

        {/* HEADER */}
        <div className="px-7 py-5 border-b border-gray-200 bg-[#fafafa]">
          <h1 className="text-[26px] font-bold text-gray-700 tracking-wide">Compose Voice Call</h1>
        </div>

        <div className="p-7">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">

            {/* CALL TYPE */}
            <div>
              <label className="text-[14px] text-gray-500 mb-2 block font-medium">Call Type</label>
              <select value={callType} onChange={(e) => setCallType(e.target.value)}
                className="w-full h-[54px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 shadow-sm">
                <option value="2">Transactional</option>
                <option value="1">Promotional</option>
              </select>
            </div>

            {/* VOICE PLAN */}
            <div>
              <label className="text-[14px] text-gray-500 mb-2 block font-medium">Voice Plan</label>
              <select value={voicePlan} onChange={(e) => setVoicePlan(e.target.value)}
                className="w-full h-[54px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 shadow-sm">
                <option value="1">Delivery Base 15</option>
                <option value="2">Delivery Base 30</option>
              </select>
            </div>

            {/* CALLER ID DROPDOWN */}
            <div>
              <label className="text-[14px] text-gray-500 mb-2 block font-medium">
                Caller ID
                <span
                  onClick={loadCallerIds}
                  className="ml-3 text-pink-500 cursor-pointer text-[12px] underline"
                >🔄 Refresh</span>
              </label>

              {callerIds.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-xl px-4 py-3 text-[13px]">
                  No Caller IDs found. Please add from <strong>Audio File</strong> section.
                </div>
              ) : (
                <select
                  value={callerId}
                  onChange={(e) => setCallerId(e.target.value)}
                  className="w-full h-[54px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 shadow-sm"
                >
                  <option value="">Select Caller ID</option>
                  {callerIds.map((c) => (
                    <option key={c.id} value={c.number}>
                      {c.name}- {c.number}
                    </option>
                  ))}
                </select>
              )}

              {callerId && (
                <div className="mt-2 bg-[#e95d96] h-[34px] rounded-lg flex items-center px-4 text-white font-semibold text-[13px] shadow">
                  📞 {callerId}
                </div>
              )}

              <div className="flex flex-wrap gap-3 mt-5">
                <button onClick={() => setShowUploadPopup(true)}
                  className="bg-[#e95d96] hover:scale-105 duration-300 text-white px-5 h-[44px] rounded-xl flex items-center gap-2 text-[13px] shadow-lg">
                  <FaUsers /> File
                </button>
                <button onClick={() => setShowGroupPopup(true)}
                  className="bg-[#34c7f3] hover:scale-105 duration-300 text-white px-5 h-[44px] rounded-xl flex items-center gap-2 text-[13px] shadow-lg">
                  <FaLayerGroup /> Group
                </button>
                <button onClick={() => setShowTestPopup(true)}
                  className="bg-[#39d65d] hover:scale-105 duration-300 text-white px-5 h-[44px] rounded-xl flex items-center gap-2 text-[13px] shadow-lg">
                  📞 Testing Call
                </button>
              </div>
            </div>

            {/* CAMPAIGN NAME */}
            <div>
              <label className="text-[14px] text-gray-500 mb-2 block font-medium">Campaign Name</label>
              <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)}
                className="w-full h-[54px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 shadow-sm" />
            </div>

          </div>

          {/* NUMBERS */}
          <div className="mt-8">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[17px] text-gray-700 font-semibold">Numbers</h2>
              <span className="text-gray-400 text-[13px]">({validCount} valid)</span>
            </div>
            <textarea
              value={numbers}
              onChange={handleNumbersChange}
              onBlur={handleNumbersBlur}
              placeholder="Enter Your Number "
              className="w-full h-[240px] border border-gray-300 rounded-2xl p-5 outline-none resize-none focus:border-pink-400 text-[14px] shadow-sm"
            />
          </div>

          {/* VOICE FILE */}
          <div className="mt-8">
            <label className="text-[14px] text-gray-500 mb-2 block font-medium">
              Select Voice File
              <span onClick={loadMediaFiles} className="ml-3 text-pink-500 cursor-pointer text-[12px] underline">
                🔄 Refresh
              </span>
            </label>
            {mediaFiles.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 rounded-xl px-4 py-3 text-[13px]">
                No voice files found. Please upload from <strong>Audio File</strong> section first.
              </div>
            ) : (
              <select value={selectedMediaId} onChange={(e) => setSelectedMediaId(e.target.value)}
                className="w-full h-[54px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 shadow-sm">
                <option value="">Select Voice File</option>
                {mediaFiles.map((f) => (
                  <option key={f.id} value={f.voice_file_id}>{f.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* RETRIES */}
          <div className="mt-6">
            <label className="text-[14px] text-gray-500 mb-2 block font-medium">Retries</label>
            <select value={retryAttempt} onChange={(e) => setRetryAttempt(e.target.value)}
              className="w-full h-[54px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 shadow-sm">
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </div>

          {/* RETRY DURATION */}
          <div className="mt-4">
            <label className="text-[14px] text-gray-500 mb-2 block font-medium">Retry Duration</label>
            <select value={retryDuration} onChange={(e) => setRetryDuration(e.target.value)}
              className="w-full h-[54px] border border-gray-300 rounded-xl px-4 outline-none focus:border-pink-400 shadow-sm">
              <option value="0">Immediate</option>
              <option value="15">15 Min</option>
              <option value="30">30 Min</option>
              <option value="60">1 Hour</option>
            </select>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap gap-5 mt-10 items-center">
            <button onClick={() => setShowConfirm(true)} disabled={loading}
              className="bg-[#e95d96] hover:scale-105 duration-300 text-white px-9 h-[50px] rounded-xl flex items-center gap-3 shadow-lg font-semibold disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <FaPaperPlane />}
              {loading ? "Sending..." : "Send Now"}
            </button>
            <span className="text-gray-500 text-[15px] font-medium">or</span>
            <button onClick={() => setShowSchedulePopup(true)}
              className="bg-[#3d2d83] hover:scale-105 duration-300 text-white px-9 h-[50px] rounded-xl flex items-center gap-3 shadow-lg font-semibold">
              <FaCalendarAlt /> Schedule Now
            </button>
          </div>

        </div>
      </div>

      {/* FILE UPLOAD POPUP */}
      {showUploadPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[520px] rounded-[18px] overflow-hidden shadow-2xl">
            <div className="bg-[#e95d96] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-[20px] font-semibold">Upload Numbers File</h2>
              <button onClick={() => setShowUploadPopup(false)} className="text-[24px]">×</button>
            </div>
            <div className="p-6">
              <div className="border border-gray-300 rounded-xl p-4">
                <input type="file" accept=".csv,.xls,.xlsx,.txt"
                  onChange={(e) => setUploadFile(e.target.files[0])} className="mb-4" />
                <p className="text-[13px] text-gray-500">Upload CSV / TXT file. Numbers in first column. Only valid 10 digit numbers will be kept.</p>
              </div>
              <div className="flex justify-end gap-3 mt-7">
                <button onClick={() => setShowUploadPopup(false)}
                  className="bg-[#ff5c5c] text-white px-6 h-[42px] rounded-lg font-medium">Close</button>
                <button onClick={handleFileUpload}
                  className="bg-[#35c2f2] text-white px-6 h-[42px] rounded-lg font-medium">Upload</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GROUP POPUP */}
      {showGroupPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[650px] rounded-[18px] overflow-hidden shadow-2xl">
            <div className="bg-[#35c2f2] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-[20px] font-semibold">Upload Group</h2>
              <button onClick={() => setShowGroupPopup(false)} className="text-[24px]">×</button>
            </div>
            <div className="p-6">
              <div className="flex gap-6 mb-6">
                <div>
                  <p className="text-[14px] text-gray-600 mb-2">From Range :</p>
                  <input type="number" value={fromRange} onChange={(e) => setFromRange(e.target.value)}
                    className="w-[180px] h-[45px] border border-gray-300 rounded-lg px-3 outline-none" />
                </div>
                <div>
                  <p className="text-[14px] text-gray-600 mb-2">To Range :</p>
                  <input type="number" value={toRange} onChange={(e) => setToRange(e.target.value)}
                    className="w-[180px] h-[45px] border border-gray-300 rounded-lg px-3 outline-none" />
                </div>
              </div>
              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#f5f5f5]">
                    <tr>
                      <th className="text-left p-4 border-b">Group Name</th>
                      <th className="text-left p-4 border-b">Total Contacts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50 cursor-pointer">
                        <td className="p-4">{g.name}</td>
                        <td className="p-4">{g.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 mt-7">
                <button onClick={() => setShowGroupPopup(false)}
                  className="bg-[#ff5c5c] text-white px-6 h-[42px] rounded-lg font-medium">Close</button>
                <button onClick={() => setShowGroupPopup(false)}
                  className="bg-[#35c2f2] text-white px-6 h-[42px] rounded-lg font-medium">Select Group</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEST CALL POPUP */}
      {showTestPopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[420px] rounded-[18px] overflow-hidden shadow-2xl">
            <div className="bg-[#39d65d] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-[20px] font-semibold">Testing Call</h2>
              <button onClick={() => setShowTestPopup(false)} className="text-[24px]">×</button>
            </div>
            <div className="p-6">
              <p className="text-[15px] text-gray-600 mb-3">Enter Mobile No. for test (10 digits)</p>
              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={testNumber}
                onChange={(e) => setTestNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full h-[48px] border border-gray-300 rounded-xl px-4 outline-none focus:border-green-400"
              />
              <div className="flex justify-end gap-3 mt-7">
                <button onClick={() => setShowTestPopup(false)}
                  className="bg-[#ff5c5c] text-white px-6 h-[42px] rounded-lg font-medium">Close</button>
                <button onClick={handleTestCall} disabled={testCallLoading}
                  className="bg-[#39d65d] disabled:opacity-60 text-white px-6 h-[42px] rounded-lg font-medium flex items-center gap-2">
                  {testCallLoading && <Loader2 size={14} className="animate-spin" />}
                  {testCallLoading ? "Sending..." : "Test Call"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE POPUP */}
      {showSchedulePopup && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white w-[500px] rounded-[22px] overflow-hidden shadow-2xl">
            <div className="bg-[#3d2d83] text-white px-6 py-4 flex justify-between items-center">
              <h2 className="text-[22px] font-semibold">Schedule Campaign</h2>
              <button onClick={() => setShowSchedulePopup(false)} className="text-[24px]">×</button>
            </div>
            <div className="p-7">
              <div className="mb-6">
                <label className="text-[15px] text-gray-600 mb-2 block font-medium">Select Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)}
                  className="w-full h-[52px] border border-gray-300 rounded-xl px-4 outline-none focus:border-[#3d2d83]" />
              </div>
              <div className="mb-6">
                <label className="text-[15px] text-gray-600 mb-2 block font-medium">Select Time</label>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full h-[52px] border border-gray-300 rounded-xl px-4 outline-none focus:border-[#3d2d83]" />
              </div>
              <div className="bg-[#f5f5f5] rounded-xl p-4 mb-7">
                <p className="text-[14px] text-gray-700">Scheduled Date :</p>
                <p className="text-[#3d2d83] font-semibold mt-1">{scheduleDate || "Not Selected"}</p>
                <p className="text-[14px] text-gray-700 mt-3">Scheduled Time :</p>
                <p className="text-[#3d2d83] font-semibold mt-1">{scheduleTime || "Not Selected"}</p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowSchedulePopup(false)}
                  className="bg-[#ff5c5c] text-white px-6 h-[44px] rounded-xl font-semibold">Close</button>
                <button onClick={handleSchedule} disabled={scheduleLoading}
                  className="bg-[#3d2d83] hover:bg-[#2c2063] disabled:opacity-50 text-white px-6 h-[44px] rounded-xl font-semibold flex items-center gap-2">
                  {scheduleLoading && <Loader2 size={14} className="animate-spin" />}
                  {scheduleLoading ? "Scheduling..." : "Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM POPUP */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-[24px] p-10 w-[390px] shadow-2xl text-center">
            <h1 className="text-[30px] font-bold text-gray-700 mb-3">Confirm Send</h1>
            <p className="text-gray-500 text-[14px] leading-7">Are you sure you want to send this campaign?</p>
            <div className="mt-4 bg-gray-50 rounded-xl p-4 text-left space-y-1">
              <p className="text-[13px] text-gray-500">
                Caller ID: <span className="font-semibold text-[#e95d96]">{callerId || "—"}</span>
              </p>
              <p className="text-[13px] text-gray-500">
                Numbers: <span className="font-semibold text-gray-700">{validCount}</span>
              </p>
              <p className="text-[13px] text-gray-500">
                Voice File: <span className="font-semibold text-gray-700">{selectedMediaId || "—"}</span>
              </p>
            </div>
            <div className="flex justify-center gap-4 mt-8">
              <button onClick={sendCampaign}
                className="bg-[#35c2f2] text-white px-8 h-[48px] rounded-xl font-semibold hover:scale-105 duration-300 shadow-lg">Yes, Send</button>
              <button onClick={() => setShowConfirm(false)}
                className="bg-[#ff5c5c] text-white px-8 h-[48px] rounded-xl font-semibold hover:scale-105 duration-300 shadow-lg">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM RESULT POPUP — replaces alert() everywhere above */}
      {popup && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-[360px] rounded-3xl p-6 text-center shadow-2xl">
            <div className="flex justify-center mb-4">
              {popupType === "error"
                ? <AlertCircle size={55} className="text-red-500" />
                : <CheckCircle2 size={55} className="text-green-500" />}
            </div>
            <h2 className="text-[24px] font-bold mb-2">{popupTitle}</h2>
            <p className="text-[15px] text-gray-600">{popupMsg}</p>

            {popupStats && (
              <div className="grid grid-cols-2 gap-2 mt-5">
                {popupStats.map(([label, val]) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-[11px] text-gray-400">{label}</p>
                    <p className="text-[18px] font-bold text-gray-700">{val}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setPopup(false)}
              className={`mt-6 px-6 py-2 rounded-full text-white text-[15px] font-semibold ${popupType === "error" ? "bg-red-500" : "bg-green-500"}`}
            >OK</button>
          </div>
        </div>
      )}

    </div>
  );
}