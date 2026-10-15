import { useState } from "react";
import { useProfile } from "../hooks/useProfile";
import { useAuth } from "../hooks/useAuth";
import { Loader2, Settings, Save, Coffee } from "lucide-react";
import { LibraryPage } from "./LibraryPage";

export function Profile() {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Initialize edit form
  const handleEdit = () => {
    setNickname(profile?.nickname || "");
    setBio(profile?.bio || "");
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    await updateProfile({ nickname, bio });
    setSaving(false);
    setIsEditing(false);
  };

  const getJoinYear = (createdAt: any) => {
    if (!createdAt) return new Date().getFullYear();
    if (typeof createdAt.toDate === 'function') return createdAt.toDate().getFullYear();
    if (createdAt.seconds) return new Date(createdAt.seconds * 1000).getFullYear();
    try {
      return new Date(createdAt).getFullYear();
    } catch {
      return new Date().getFullYear();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="max-w-[1400px] mx-auto py-20 px-4 text-center">
         <h1 className="text-2xl font-bold text-foreground">Sign in to view your profile</h1>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-10 pb-20 -mx-4 md:-mx-8 -mt-4 md:-mt-8">
      
      {/* Profile Header Block */}
      <div className="relative w-full bg-dark-surface border-b border-border shadow-sm pt-12 pb-6 md:h-[250px] md:pt-0 md:pb-0">
         <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10" />
         
         <div className="max-w-[1400px] mx-auto px-4 md:px-8 h-full relative z-20 flex flex-col md:flex-row items-center md:items-end justify-center md:justify-start pb-0 md:pb-8 gap-4 md:gap-6 text-center md:text-left">
            <img 
              src={profile.photoURL || user.photoURL || "https://picsum.photos/seed/avatar/200"} 
              alt="Avatar" 
              referrerPolicy="no-referrer"
              className="w-20 h-20 md:w-32 md:h-32 rounded-2xl border-2 md:border-4 border-background object-cover shadow-xl shrink-0 relative z-30" 
            />
            
            <div className="flex-1 w-full flex flex-col items-center md:items-start relative z-30">
              {isEditing ? (
                 <div className="flex flex-col gap-2 w-full max-w-sm">
                   <input 
                     type="text" 
                     value={nickname}
                     onChange={(e) => setNickname(e.target.value)}
                     placeholder="Choose a nickname..." 
                     maxLength={50}
                     className="bg-card border border-border px-3 py-1.5 rounded text-foreground font-bold focus:outline-none focus:border-accent transition-colors text-sm text-center md:text-left"
                   />
                   <textarea
                     value={bio}
                     onChange={(e) => setBio(e.target.value)}
                     placeholder="Write a bio..."
                     maxLength={500}
                     className="bg-card border border-border px-3 py-2 rounded text-foreground focus:outline-none focus:border-accent transition-colors text-xs resize-none h-20 text-center md:text-left"
                   />
                 </div>
              ) : (
                 <div className="flex flex-col gap-1 items-center md:items-start w-full">
                   <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground truncate w-full">
                     {profile.nickname || profile.displayName || "Anonymous"}
                   </h1>
                   <p className="text-[10px] md:text-sm font-mono text-gray-500 uppercase tracking-widest mt-1 md:mt-0">
                     Member since {getJoinYear(profile.createdAt)}
                   </p>
                   {profile.bio && (
                     <p className="text-xs md:text-sm text-gray-300 mt-2 max-w-2xl font-serif leading-relaxed line-clamp-3 md:line-clamp-none">
                       {profile.bio}
                     </p>
                   )}
                 </div>
              )}
            </div>

            <div className="shrink-0 w-full md:w-auto relative z-30 mt-2 md:mt-0 flex flex-col gap-2 items-stretch md:items-end">
              <a 
                 href="https://buymeacoffee.com/xxlozerxd" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center justify-center gap-2 bg-[#FFDD00] hover:bg-[#ffe533] text-black border border-transparent px-4 py-2 w-full md:w-auto rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-sm active:scale-95"
              >
                 <Coffee className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
                 Buy Me a Coffee
              </a>
              {isEditing ? (
                 <button 
                   onClick={handleSave} 
                   disabled={saving}
                   className="flex items-center justify-center gap-2 bg-accent hover:bg-accent/80 text-white px-4 py-2 w-full md:w-auto rounded-lg font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
                 >
                   {saving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
                   Save Profile
                 </button>
              ) : (
                 <button 
                   onClick={handleEdit}
                   className="flex items-center justify-center gap-2 bg-card hover:bg-dark border border-border px-4 py-2 w-full md:w-auto rounded-lg font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors text-white shadow-sm"
                 >
                   <Settings className="w-3.5 h-3.5 shrink-0" />
                   Edit Profile
                 </button>
              )}
            </div>
         </div>
      </div>

      <LibraryPage />

    </div>
  );
}
