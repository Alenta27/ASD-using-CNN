import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FaUserPlus, FaUserEdit, FaTrash, FaFileMedicalAlt, FaHistory, FaGraduationCap, FaClipboardList } from 'react-icons/fa';

// Local storage helpers for simple persistence
const CHILDREN_KEY = 'children';

const loadChildren = () => {
  try {
    const raw = localStorage.getItem(CHILDREN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveChildren = (children) => {
  try {
    localStorage.setItem(CHILDREN_KEY, JSON.stringify(children));
  } catch {}
};

// Child form modal for Add/Edit
function ChildFormModal({ isOpen, onClose, onSave, initial }) {
  const [name, setName] = useState(initial?.name || '');
  const [age, setAge] = useState(initial?.age || '');
  const [gender, setGender] = useState(initial?.gender || '');
  const [history, setHistory] = useState(initial?.history || '');
  const [birthCert, setBirthCert] = useState(initial?.birthCert || null);
  const [fileError, setFileError] = useState('');
  const [errors, setErrors] = useState({ name: '', age: '', gender: '', birthCert: '' });
  const [touched, setTouched] = useState({ name: false, age: false, gender: false, birthCert: false });

  useEffect(() => {
    if (isOpen) {
      setName(initial?.name || '');
      setAge(initial?.age || '');
      setGender(initial?.gender || '');
      setHistory(initial?.history || '');
      setBirthCert(initial?.birthCert || null);
      setFileError('');
      setErrors({ name: '', age: '', gender: '', birthCert: '' });
      setTouched({ name: false, age: false, gender: false, birthCert: false });
    }
  }, [isOpen, initial]);

  const validate = () => {
    const ageNum = Number(age);
    const next = {
      name: !name.trim() ? 'Name is required.' : '',
      age: age === '' || Number.isNaN(ageNum)
        ? 'Age is required.'
        : ageNum < 0 || ageNum > 25
        ? 'Enter an age between 0 and 25.'
        : '',
      gender: !gender ? 'Gender is required.' : '',
      birthCert: birthCert ? '' : 'Birth certificate is required.',
    };
    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleBlur = (field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    validate();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      name: name.trim(),
      age: Number(age) || '',
      gender,
      history: history.trim(),
      birthCert: birthCert || null,
    });
  };

  const handleBirthCertChange = (e) => {
    setFileError('');
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const maxBytes = 5 * 1024 * 1024; // 5MB
    if (!allowedTypes.includes(file.type)) {
      setFileError('Only PDF, JPG, PNG, or WEBP files are allowed.');
      return;
    }
    if (file.size > maxBytes) {
      setFileError('File is too large. Max size is 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBirthCert({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: String(reader.result),
      });
    };
    reader.onerror = () => setFileError('Failed to read the file. Please try again.');
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-800">{initial ? 'Edit Child Profile' : 'Add Child Profile'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} onBlur={() => handleBlur('name')} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
            {touched.name && errors.name && (<p className="mt-1 text-xs text-red-600">{errors.name}</p>)}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
              <input type="number" min="0" value={age} onChange={(e) => setAge(e.target.value)} onBlur={() => handleBlur('age')} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
              {touched.age && errors.age && (<p className="mt-1 text-xs text-red-600">{errors.age}</p>)}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)} onBlur={() => handleBlur('gender')} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required>
                <option value="" disabled>Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="others">Others</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
              {touched.gender && errors.gender && (<p className="mt-1 text-xs text-red-600">{errors.gender}</p>)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Medical/Developmental History</label>
            <textarea rows="4" value={history} onChange={(e) => setHistory(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="e.g., prior assessments, therapies, milestones, concerns" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Upload Birth Certificate</label>
            <input type="file" accept=".pdf,image/*" onChange={(e) => { handleBirthCertChange(e); setTouched((t)=>({...t, birthCert:true})); }} onBlur={() => handleBlur('birthCert')} className="w-full" />
            {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
            {touched.birthCert && errors.birthCert && !fileError && (<p className="text-xs text-red-600 mt-1">{errors.birthCert}</p>)}
            {birthCert && (
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-700 truncate max-w-[70%]" title={birthCert.name}>{birthCert.name}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={birthCert.dataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    className="text-red-600 hover:text-red-800"
                    onClick={() => setBirthCert(null)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Accepted: PDF, JPG, PNG, WEBP. Max 5MB.</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border hover:bg-gray-50">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [children, setChildren] = useState(() => loadChildren());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChild, setEditingChild] = useState(null);

  // Optional: preselect child via ?childId param
  const childIdParam = useMemo(() => searchParams.get('childId'), [searchParams]);

  useEffect(() => {
    saveChildren(children);
  }, [children]);

  const handleAddClick = () => {
    setEditingChild(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (child) => {
    setEditingChild(child);
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this child profile?')) {
      setChildren((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleSaveChild = (child) => {
    setChildren((prev) => {
      const exists = prev.some((c) => c.id === child.id);
      if (exists) return prev.map((c) => (c.id === child.id ? child : c));
      return [child, ...prev];
    });
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Parent Dashboard</h1>
          <div className="flex flex-wrap gap-3">
            <Link to="/screening-tools" className="inline-flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg hover:bg-emerald-700">
              <FaClipboardList /> Screening Tools
            </Link>
            <Link to="/reports" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700">
              <FaHistory /> Reports
            </Link>
            <Link to="/learning" className="inline-flex items-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-lg hover:bg-purple-700">
              <FaGraduationCap /> Learning Hub
            </Link>
            <button onClick={handleAddClick} className="inline-flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700">
              <FaUserPlus /> Add Child
            </button>
          </div>
        </div>

        {/* Child Profiles Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => (
            <div key={child.id} className={`bg-white rounded-lg shadow-md p-6 flex flex-col ${childIdParam === child.id ? 'ring-2 ring-indigo-500' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-gray-800">{child.name}</h2>
                  <p className="text-gray-600">Age: {child.age || '—'} · {child.gender || '—'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEditClick(child)} className="p-2 rounded-md bg-yellow-100 text-yellow-700 hover:bg-yellow-200" title="Edit">
                    <FaUserEdit />
                  </button>
                  <button onClick={() => handleDelete(child.id)} className="p-2 rounded-md bg-red-100 text-red-700 hover:bg-red-200" title="Delete">
                    <FaTrash />
                  </button>
                </div>
              </div>

              {child.history && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap">{child.history}</p>
                </div>
              )}

              {child.birthCert && (
                <div className="mt-3 text-sm">
                  <p className="text-gray-700">Birth Certificate:</p>
                  <a href={child.birthCert.dataUrl} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 break-all">
                    {child.birthCert.name}
                  </a>
                </div>
              )}

              <div className="border-t pt-4 mt-4 grid grid-cols-1 gap-3">
                <button onClick={() => navigate('/screening', { state: { childId: child.id } })} className="w-full bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700 transition flex items-center justify-center">
                  <FaFileMedicalAlt className="mr-2" /> Start New Screening
                </button>
                <button onClick={() => navigate(`/reports?childId=${child.id}`)} className="w-full bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300 transition flex items-center justify-center">
                  <FaHistory className="mr-2" /> View Reports
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Placeholder when none */}
        {children.length === 0 && (
          <div className="mt-10 text-center bg-white p-12 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-800">No Child Profiles Yet</h2>
            <p className="text-gray-500 mt-2 mb-6">Add a profile to begin screenings and track reports.</p>
            <button onClick={handleAddClick} className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 inline-flex items-center">
              <FaUserPlus className="mr-2" /> Add Your First Child
            </button>
          </div>
        )}
      </div>

      <ChildFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveChild} initial={editingChild} />
    </div>
  );
};

export default DashboardPage;