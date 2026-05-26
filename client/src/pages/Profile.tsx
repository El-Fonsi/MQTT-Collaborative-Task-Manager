import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'https://mqtt-collaborative-task-manager.onrender.com';

export function Profile() {
  const { user, token, setAuth, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleSaveName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.put('/auth/profile', { name: name.trim() });
      updateUser({ name: data.name });
      notifications.show({ title: 'Saved', message: 'Name updated', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to update name', color: 'red' });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      const { data } = await api.post('/auth/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ avatar: data.user.avatar });
      if (data.token) setAuth(data.user, data.token);
      notifications.show({ title: 'Uploaded', message: 'Avatar updated', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to upload avatar', color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <Text fw={700} size="lg">Profile</Text>
      </div>

      <div className="glass rounded-xl p-6 space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative cursor-pointer group" onClick={handleAvatarClick}>
            <Avatar
              src={user?.avatar?.startsWith('/uploads') ? `${API_BASE}${user.avatar}` : user?.avatar}
              alt={user?.name}
              size={96}
              color="indigo"
              className="ring-4 ring-gray-200 dark:ring-gray-700"
            >
              {user?.name?.charAt(0).toUpperCase()}
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="light"
            size="xs"
            onClick={handleAvatarClick}
            loading={uploading}
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </Button>
        </div>

        <TextInput
          label="Email"
          value={user?.email || ''}
          disabled
          description="Email cannot be changed"
        />

        <div>
          <TextInput
            label="Name"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Your name"
          />
          <Group mt="xs">
            <Button
              onClick={handleSaveName}
              loading={saving}
              className="bg-gradient-to-r from-indigo-500 to-cyan-500 text-white"
            >
              Save
            </Button>
          </Group>
        </div>

        <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
          <Text size="xs" c="dimmed">
            Member since {user?.id ? new Date(parseInt(user.id.substring(0, 8), 16) * 1000).toLocaleDateString() : '-'}
          </Text>
        </div>
      </div>
    </div>
  );
}
