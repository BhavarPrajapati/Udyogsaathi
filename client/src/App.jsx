import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('udyogUser')) || null);
  const [lang, setLang] = useState(localStorage.getItem('udyogLang') || null);
  const [view, setView] = useState('feed'); 
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [instantData, setInstantData] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAI, setShowAI] = useState(false);
  const [aiChat, setAIChat] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showUserModal, setShowUserModal] = useState(null);
  const [myActivity, setMyActivity] = useState({ posts: [], instant: [] });
  const [loading, setLoading] = useState(false);
  const API_URL = "https://udyog-saathi-backend.onrender.com/api";
  const isFetching = useRef(false);

  
  const fetchData = async () => {
    if (isFetching.current || !user || document.hidden) return;
    
    isFetching.current = true; 
    try {
        const responses = await Promise.all([
            fetch(`${API_URL}/jobs`),
            fetch(`${API_URL}/worker-profiles`),
            fetch(`${API_URL}/instant-services`),
            fetch(`${API_URL}/notifications/${user.email}`)
        ]);

        const [j, w, i, n] = await Promise.all(responses.map(r => r.json()));
        
        setJobs(j); 
        setWorkers(w); 
        setInstantData(i); 
        setNotifications(n);

        if (view === 'profile' && user?.email) {
          try {
            const actRes = await fetch(`${API_URL}/user-activity/${user.email}`);
            const actData = await actRes.json();
            setMyActivity(actData);
          } catch (e) {
              console.error("Profile sync error");
          }
        }
    } catch (e) { 
        console.error("Slow Network Detected"); 
    } finally {
        isFetching.current = false;
    }
  };

  useEffect(() => {
    fetchData();
    const itv = setInterval(fetchData, 20000); 
    return () => clearInterval(itv);
  }, [user?.email, view]);

  useEffect(() => { 
    if(activeChat) {
        const itv = setInterval(() => { fetch(`${API_URL}/chat/${user.email}/${activeChat.email}`).then(r=>r.json()).then(setChatHistory); }, 3000);
        return () => clearInterval(itv);
    }
  }, [activeChat]);

  const handleLogout = () => { localStorage.clear(); window.location.reload(); };

  if (!lang) return <LangScreen setLang={setLang} />;
  if (!user) return <AuthScreen onLogin={d => { localStorage.setItem('udyogUser', JSON.stringify(d)); setUser(d); }} />;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 md:pb-0 font-sans overflow-x-hidden">
     
      <nav className="bg-white border-b p-4 sticky top-0 z-50 flex justify-between items-center px-4 md:px-20 shadow-sm">
        
        <h1 className="text-lg md:text-xl font-black text-blue-600 uppercase cursor-pointer" onClick={() => setView('feed')}>
          Udyog Saathi
        </h1>
    
        <div className="flex items-center gap-2 md:hidden">
          <button 
            onClick={() => setShowAI(true)} 
            className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center text-xl border border-blue-100 active:scale-90"
          >
            🤖
          </button>
          <button onClick={handleLogout} className="bg-rose-50 text-rose-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-rose-100">
            Logout
          </button>
        </div>

        <div className="hidden md:flex gap-10 items-center text-[11px] font-bold uppercase tracking-widest">
          <button onClick={() => setView('feed')} className="hover:text-blue-600 font-bold">HOME</button>
          <button onClick={() => setView('instant')} className="hover:text-blue-600 font-bold">INSTANT ⚡</button>
          <button onClick={() => setView('chat')} className="hover:text-blue-600 font-bold">CHATS</button>
          <button onClick={() => setView('notif')} className="hover:text-blue-600 font-bold">NOTIFS</button>
          <button onClick={() => setView('profile')} className="hover:text-blue-600 font-bold">PROFILE</button>
        
          <button 
            onClick={() => setShowAI(true)} 
            className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 font-bold transition-all active:scale-95 shadow-md flex items-center gap-2"
          >
            <span>AI GURU</span> ✨
          </button>

          <button onClick={handleLogout} className="bg-red-500 text-white px-5 py-2 rounded-full font-bold">Logout</button>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-4 md:p-10 animate-fadeIn">
        {view === 'feed' && <FeedView user={user} jobs={jobs} workers={workers} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setView={setView} API_URL={API_URL} fetchData={fetchData} setShowUserModal={setShowUserModal} />}
        {view === 'instant' && <InstantHub data={instantData} searchTerm={searchTerm} setSearchTerm={setSearchTerm} setView={setView} onProfile={setShowUserModal} setActiveChat={setActiveChat} user={user} />}
        {view === 'chat' && <InstaChat apps={notifications.filter(a => a.status === 'approved')} user={user} activeChat={activeChat} setActiveChat={setActiveChat} chatHistory={chatHistory} API_URL={API_URL} />}
        {view === 'notif' && <InstaNotif notifications={notifications} user={user} API_URL={API_URL} fetchData={fetchData} setView={setView} />}
        {view === 'profile' && <ProfileWall user={user} activity={myActivity} API_URL={API_URL} fetchData={fetchData} setIsEditing={setIsEditing} isEditing={isEditing} setUser={setUser} setView={setView} />}
        {view === 'post' && <SocialForm user={user} setView={setView} API_URL={API_URL} fetchData={fetchData} loading={loading} setLoading={setLoading} />}
        {view === 'post_instant' && <InstantForm user={user} setView={setView} API_URL={API_URL} fetchData={fetchData} />}
      </main>

      
      <div className="md:hidden fixed bottom-0 w-full bg-white border-t flex justify-around p-4 z-50 shadow-lg font-bold">
         <button onClick={() => setView('feed')} className={view==='feed'?'text-blue-600':'text-slate-400'}>
           <span className="block text-xl">🏠</span>
         </button>
         <button onClick={() => setView('instant')} className={view==='instant'?'text-blue-600':'text-slate-400'}>
           <span className="block text-xl">⚡</span>
         </button>
         <button onClick={() => setView('chat')} className={view==='chat'?'text-blue-600':'text-slate-400'}>
           <span className="block text-xl">💬</span>
         </button>
         <button
          onClick={() => setView('notif')}
          className={`${
            view === 'notif' ? 'text-blue-600' : 'text-slate-400'
          }`}
         >
          <span className="relative inline-block text-xl">
           🔔
           {notifications.length > 0 && (
             <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-white">
               {notifications.length}
             </span>
            )}
          </span>
         </button>

         <button onClick={() => setView('profile')} className={view==='profile'?'text-blue-600':'text-slate-400'}>
           <span className="block text-xl">👤</span>
         </button>
      </div>

      {showAI && <AIModal user={user} aiChat={aiChat} setAIChat={setAIChat} setShowAI={setShowAI} API_URL={API_URL} />}
      {showUserModal && <ProfileDetailModal data={showUserModal} onClose={() => setShowUserModal(null)} API_URL={API_URL} setView={setView} />}
    </div>
  );
}

const uploadToCloudinary = async (base64Image) => {
    try {
        const res = await fetch(`http://localhost:5000/api/upload-image`, { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: base64Image })
        });
        
        if (!res.ok) {
            const errorText = await res.text();
            console.error("Server Rejected Upload:", errorText);
            return null;
        }

        const data = await res.json();
        return data.url; 
    } catch (err) {
        console.error("Network upload error:", err);
        return null;
    }
};

function FeedView({ user, jobs, workers, searchTerm, setSearchTerm, setView, API_URL, fetchData, setShowUserModal }) {
  const data = user.role === 'Worker' ? jobs : workers;
  const keywords = ["Helper", "Delivery Rider", "Hospital", "Shop", "Security", "Driver"];
  
  return (
    <div className="space-y-6 font-normal">
      <div className="space-y-4">
          <h2 className="text-2xl font-black text-slate-800">Hi, {user.name} 👋</h2>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {keywords.map(k => (
                  <button key={k} onClick={() => setSearchTerm(k)} className="px-4 py-1.5 bg-white border rounded-full text-[10px] font-bold uppercase hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap shadow-sm">
                      {k}
                  </button>
              ))}
          </div>
      </div>

      <input type="text" value={searchTerm} placeholder="Search..." className="w-full p-4 bg-white border rounded-2xl outline-none font-bold text-sm shadow-sm focus:border-blue-400 transition-all" onChange={e => setSearchTerm(e.target.value)} />
      
      <div className="space-y-2">
          <button onClick={() => setView('post')} className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold uppercase shadow-lg hover:bg-blue-700 transition-all active:scale-95">+ Create New Post</button>
          <p className="text-[10px] text-center text-slate-400 font-bold uppercase">This post will only be visible within the {user.role === 'Worker' ? 'Businesses' : 'Workers'} profile</p>
      </div>
      
      {data.filter(d => (d.title || d.skill || "").toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
        <PostCard key={p._id} p={p} user={user} setShowUserModal={setShowUserModal} API_URL={API_URL} />
      ))}
    </div>
  );
}
function PostCard({ p, user, setShowUserModal, API_URL, fetchData }) {
    
    const storageKey = `applied_${user.email}_${p._id}`;
    const [isApplied, setIsApplied] = useState(localStorage.getItem(storageKey) === 'true');
    
    const [likes, setLikes] = useState(p.likes || 0);
    const [isLiked, setIsLiked] = useState(false);
    const [applying, setApplying] = useState(false); 
    const [showApplyPopup, setShowApplyPopup] = useState(false);
    const [comments, setComments] = useState(p.comments || []);
    const [commentInput, setCommentInput] = useState("");

    const handleApply = async () => {
        if (isApplied || applying) return;
        setApplying(true); 

        try {
            const res = await fetch(`${API_URL}/notifications`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toEmail: p.ownerEmail || p.email,
                    fromEmail: user.email,
                    fromName: user.name,
                    title: p.title || p.skill
                })
            });

            if (res.ok) {
                
                localStorage.setItem(storageKey, 'true');
                setIsApplied(true);
                setShowApplyPopup(true);
            } else {
                alert("Server issue! Please try again later.");
            }
        } catch (err) {
            alert("Check your internet or server!");
        } finally {
            setApplying(false);
        }
    };

    const handleComment = (e) => {
        e.preventDefault();
        if(!commentInput.trim()) return;
        const newComment = { userName: user.name, text: commentInput };
        setComments([...comments, newComment]);
        setCommentInput("");
        fetch(`${API_URL}/add-comment/${p._id}`, {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(newComment)
        });
    };

    return (
        <div id={p._id} className="bg-white border rounded-[2rem] overflow-hidden shadow-sm mb-10 font-normal border-slate-100 relative">
            
            <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setShowUserModal({name: p.ownerName || p.name, email: p.ownerEmail || p.email})}>
                <img src={p.ownerPic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className="w-10 h-10 rounded-full border shadow-sm" alt="profile" />
                <h4 className="font-bold text-[13px] uppercase">{p.ownerName || p.name}</h4>
            </div>
            
            <img src={p.image} className="w-full object-cover max-h-[400px] border-y shadow-inner" alt="post" />
            
            <div className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <span className="font-black text-2xl text-blue-600">₹{p.salary || p.expectedSalary}</span>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">📍 {p.location}</p>
                    </div>

                    
                    <button 
                        onClick={handleApply}
                        disabled={applying || isApplied}
                        className={`px-8 py-3 rounded-full text-[10px] font-black uppercase transition-all shadow-md active:scale-90 ${
                            isApplied ? 'bg-emerald-500 text-white cursor-default' : applying ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white hover:bg-blue-600'
                        }`}
                    >
                        {applying ? "Wait..." : isApplied ? "Applied ✓" : "Apply Now"}
                    </button>
                </div>

                <p className="text-[13px] text-slate-700 leading-relaxed font-bold">
                    <span className="font-black uppercase text-blue-600 mr-2">{p.title || p.skill}</span>
                    {p.description || p.experience}
                </p>

                
                <div className="flex gap-8 pt-4 border-t border-slate-50 text-[10px] font-black uppercase text-slate-400">
                    <button onClick={() => {setLikes(l => isLiked ? l-1 : l+1); setIsLiked(!isLiked)}} className={`${isLiked ? 'text-red-500' : ''} flex items-center gap-1`}>
                        {isLiked ? '❤️' : '🤍'} {likes}
                    </button>
                    <button className="flex items-center gap-1">💬 {comments.length} Comments</button>
                    <button onClick={() => alert("Link Copied!")}>🔗 Share</button>
                </div>

                <form onSubmit={handleComment} className="relative mt-2">
                    <input type="text" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="Write a comment..." className="w-full p-4 pr-16 bg-slate-50 rounded-2xl text-xs outline-none border border-slate-100" />
                    <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 font-black text-[10px] uppercase">Post</button>
                </form>
            </div>

            {showApplyPopup && (
              <div className="absolute inset-0 z-50 flex items-center justify-center">
      
               
                <div 
                  className="absolute inset-0 bg-black/40 rounded-3xl"
                  onClick={() => setShowApplyPopup(false)}
                ></div>

                
                <div className="relative bg-white p-8 rounded-[2.5rem] w-[280px] shadow-2xl text-center animate-slideUp">
          
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
                    ✓
                  </div>

                  <h3 className="text-lg font-black uppercase text-slate-800 mb-2">
                    Applied!
                  </h3>

                  <p className="text-[11px] text-slate-500 font-bold uppercase mb-6 leading-tight">
                    Request sent successfully.<br />Saved to profile.
                  </p>

                  <button 
                    onClick={() => setShowApplyPopup(false)}
                    className="w-full bg-slate-950 text-white py-3 rounded-xl font-black uppercase tracking-widest active:scale-95"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

        </div>
    );
}
function ProfileDetailModal({ data, onClose, API_URL, setView }) {
   const [act, setAct] = useState({ posts: [], instant: [] });

   useEffect(() => { 
     if (data && data.email) {
       fetch(`${API_URL}/user-activity/${data.email}`)
         .then(r => r.json())
         .then(setAct)
         .catch(err => console.error("Activity Fetch Error:", err));
     } 
   }, [data, API_URL]);

   if (!data) return null;

  
   const allActivities = [
     ...act.posts.map(p => ({ ...p, type: 'feed' })),
     ...(act.instant || []).map(i => ({ ...i, type: 'instant', title: i.role }))
   ];

   return (
     <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-slideUp border-[8px] border-white">
           <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 shadow-sm z-10">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg">
                    {data.name ? data.name[0] : 'U'}
                  </div>
                  <h3 className="font-black text-lg uppercase tracking-tighter text-slate-800">{data.name}</h3>
              </div>
              <button onClick={onClose} className="text-xl p-2 bg-slate-50 rounded-full hover:bg-rose-500 hover:text-white transition-all">✕</button>
           </div>

           <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/30">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] border-b pb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                Verified Activities
              </p>

              {allActivities.length > 0 ? allActivities.map(p => (
                <div 
                   key={p._id} 
                   onClick={() => { 
                      setView(p.type); 
                      onClose();      
                      
                      setTimeout(() => {
                        const element = document.getElementById(p._id);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          element.classList.add('ring-4', 'ring-blue-400', 'transition-all');
                          setTimeout(() => element.classList.remove('ring-4', 'ring-blue-400'), 2000);
                        }
                      }, 800);
                   }} 
                   className="p-4 bg-white rounded-2xl flex justify-between items-center border border-slate-100 hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer group shadow-sm active:scale-95"
                >
                   <div className="flex flex-col">
                      <span className="font-black text-[11px] uppercase text-slate-700 group-hover:text-blue-600">
                        {p.title || p.skill} {p.type === 'instant' ? '⚡' : ''}
                      </span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                         {p.type === 'instant' ? 'Instant Service' : (p.category || 'Marketplace')}
                      </span>
                   </div>
                   <span className="font-black text-blue-600 text-[10px] underline underline-offset-4">OPEN POST</span>
                </div>
              )) : (
                <div className="text-center py-10 opacity-30 font-black uppercase text-[10px]">No Recent Records Found</div>
              )}
           </div>
        </div>
     </div>
   );
}
function ProfileWall({ user, activity, API_URL, fetchData, setIsEditing, isEditing, setUser, setView }) {
    const fileRef = useRef();
    const [previewImg, setPreviewImg] = useState(user.profilePic);
    const [uploading, setUploading] = useState(false); 

    const myPosts = activity.posts || [];
    const myInstant = activity.instant || [];

    const handleDelete = async (type, id) => {
        if(window.confirm(`Are you sure you want to delete this ${type} permanently?`)) { 
            try {
                const endpoint = type === 'instant' ? `delete/instant/${id}` : `delete/${user.role === 'Worker' ? 'worker' : 'job'}/${id}`;
                const res = await fetch(`${API_URL}/${endpoint}`, { method: 'DELETE' });
                if (res.ok) {
                    alert("Deleted permanently! 🗑️");
                    fetchData();
                }
            } catch (err) { alert("Network Error!"); }
        }
    };

    return (
        <div className="space-y-6 animate-fadeIn pb-20 font-normal">
            <div className="bg-white p-10 rounded-[3rem] text-center border border-slate-100 shadow-sm relative overflow-hidden">
                
                <div className="absolute top-8 right-10 flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">Active Now</span>
                </div>

                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-40"></div>
                
                
                <div className="relative inline-block cursor-pointer group mt-4" onClick={() => isEditing && !uploading && fileRef.current.click()}>
                    <div className="w-28 h-28 rounded-full p-1 bg-white shadow-2xl relative z-10 border-2 border-slate-50 overflow-hidden">
                        <img src={previewImg || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                             className={`w-full h-full object-cover shadow-inner ${uploading ? 'opacity-30' : ''}`} alt="profile" />
                        
                        {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-30">
                                <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                    
                    {isEditing && !uploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-full z-20 flex flex-col items-center justify-center text-white gap-1 transition-opacity">
                            <span className="text-xl">📸</span>
                            <span className="text-[8px] font-black uppercase">Change</span>
                        </div>
                    )}
                    <input type="file" hidden ref={fileRef} accept="image/*" onChange={e => {
                        const r = new FileReader(); 
                        r.readAsDataURL(e.target.files[0]);
                        r.onloadend = () => setPreviewImg(r.result);
                    }} />
                </div>

                <h2 className="text-3xl font-black mt-5 uppercase tracking-tighter text-slate-800">{user.name}</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em] mt-1 underline decoration-blue-500 decoration-2 underline-offset-8">{user.role} Certified Profile</p>
                
                {isEditing ? (
                    <form onSubmit={async e => {
                        e.preventDefault();
                        setUploading(true); 
                        
                        let finalProfilePic = user.profilePic;

                       
                        if (previewImg && previewImg.startsWith('data:image')) {
                            const uploadedUrl = await uploadToCloudinary(previewImg);
                            if (uploadedUrl) finalProfilePic = uploadedUrl;
                        }

                        const d = Object.fromEntries(new FormData(e.target));
                        
                        
                        const res = await fetch(`${API_URL}/profile-update`, { 
                            method: 'PUT', 
                            headers: {'Content-Type':'application/json'}, 
                            body: JSON.stringify({...d, email: user.email, role: user.role, profilePic: finalProfilePic}) 
                        });
                        
                        const r = await res.json(); 
                        setUser(r.user); 
                        localStorage.setItem('udyogUser', JSON.stringify(r.user));
                        setIsEditing(false); 
                        setUploading(false);
                        fetchData();
                    }} className="mt-8 space-y-4 bg-slate-50 p-6 rounded-2xl text-left border shadow-inner animate-fadeIn">
                        <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Full Name</label><input name="name" defaultValue={user.name} className="w-full p-4 border rounded-xl font-bold outline-none shadow-sm mt-1" /></div>
                        <div><label className="text-[9px] font-black text-slate-400 uppercase ml-2">Mobile Phone</label><input name="contact" defaultValue={user.contact} className="w-full p-4 border rounded-xl font-bold outline-none shadow-sm mt-1" /></div>
                        
                        <div className="flex gap-4 pt-2">
                            <button disabled={uploading} className={`flex-grow py-3 rounded-xl font-bold uppercase text-xs shadow-md ${uploading ? 'bg-slate-300 text-slate-500' : 'bg-blue-600 text-white shadow-blue-100'}`}>
                                {uploading ? "Updating..." : "Save Profile"}
                            </button>
                            <button type="button" onClick={() => setIsEditing(false)} className="px-6 bg-slate-200 rounded-xl text-xs font-bold uppercase shadow-sm">Back</button>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => setIsEditing(true)} className="mt-8 bg-slate-900 text-white px-10 py-2.5 rounded-full text-[10px] font-bold uppercase shadow-lg hover:bg-blue-600 transition-all active:scale-95">Edit Profile Details</button>
                )}
            </div>

            
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-3xl text-center shadow-sm border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Wall Posts</p>
                    <p className="text-4xl font-black">{myPosts.length}</p>
                </div>
                <div className="bg-white p-6 rounded-3xl text-center shadow-sm border border-slate-100">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Instant Active</p>
                    <p className="text-4xl font-black text-blue-600">{myInstant.length}</p>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-black text-[10px] uppercase tracking-[0.5em] border-b pb-4 text-center mt-10 text-slate-400">My Platform History</h3>
                
                
                {myPosts.map(p => (
                    <div key={p._id} className="p-5 bg-white border rounded-[2rem] flex justify-between items-center shadow-sm border-l-[12px] border-l-slate-900">
                        <div>
                           <p className="font-black text-[14px] uppercase text-slate-800">{p.title || p.skill}</p>
                           <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest">₹{p.salary || p.expectedSalary} • {p.location}</p>
                        </div>
                        <button onClick={() => handleDelete('post', p._id)} className="text-rose-500 bg-rose-50 px-5 py-2.5 rounded-2xl text-[10px] font-black shadow-inner border border-rose-100 active:scale-95 uppercase transition-all">Delete</button>
                    </div>
                ))}

                
                {myInstant.map(s => (
                    <div key={s._id} className="p-5 bg-white border rounded-[2rem] flex justify-between items-center shadow-sm border-l-[12px] border-l-blue-600">
                        <div>
                           <p className="font-black text-[14px] uppercase text-blue-600">{s.role} ⚡</p>
                           <p className="text-[9px] text-slate-400 font-bold mt-2 uppercase tracking-widest">₹{s.budget} • {s.location}</p>
                        </div>
                        <button onClick={() => handleDelete('instant', s._id)} className="text-rose-500 bg-rose-50 px-5 py-2.5 rounded-2xl text-[10px] font-black shadow-inner border border-rose-100 active:scale-95 uppercase transition-all">Remove</button>
                    </div>
                ))}

                {myPosts.length === 0 && myInstant.length === 0 && (
                    <p className="text-center opacity-30 py-10 font-bold uppercase text-[10px]">No History Found</p>
                )}
            </div>
        </div>
    );
}

function InstantHub({ data, searchTerm, setSearchTerm, setView, onProfile, setActiveChat, user }) {
    
    const instantKeywords = ["Chef", "Cleaning", "Electrician", "Driver", "Plumber", "Tutor"];
    

    return (
        <div className="space-y-6 animate-fadeIn font-normal pb-24">
            <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
                <h2 className="text-xl font-black uppercase tracking-tighter text-slate-800">
                    Instant Services <span className="text-blue-600">⚡</span>
                </h2>
                <button 
                    onClick={() => setView('post_instant')} 
                    className="bg-slate-900 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95"
                >
                    + Go Live
                </button>
            </div>

            
            <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {instantKeywords.map(k => (
                        <button 
                            key={k} 
                            onClick={() => setSearchTerm(k)} 
                            className={`px-4 py-1.5 border rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap shadow-sm ${
                                searchTerm === k ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 hover:bg-blue-50'
                            }`}
                        >
                            {k}
                        </button>
                    ))}
                    <button 
                        onClick={() => setSearchTerm("")} 
                        className="px-4 py-1.5 bg-slate-100 border rounded-full text-[10px] font-bold uppercase text-slate-400"
                    >
                        Clear
                    </button>
                </div>

                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search services (e.g. Chef, Driver)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-xs font-bold outline-none shadow-sm uppercase"
                    />
                </div>
            </div>
            
            <div className="space-y-5">
                {data.filter(s => (s.role||"").toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
                    <div key={s._id} className="bg-white border rounded-[2rem] overflow-hidden shadow-sm border-slate-100 p-5 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => onProfile({name: s.ownerName, email: s.ownerEmail})}>
                            <div className="w-12 h-12 rounded-full border-2 border-blue-50 overflow-hidden shadow-inner bg-slate-100">
                                <img src={s.image || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className="w-full h-full object-cover" alt="provider" />
                            </div>
                            <div>
                                <h3 className="font-black text-[13px] uppercase leading-none text-slate-800">{s.ownerName || s.name || "Verified Professional"}</h3>
                                <p className="text-[8px] text-blue-600 font-bold uppercase tracking-[0.2em] mt-1">Verified Expert</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-start mb-3 px-1">
                            <div>
                                <h4 className="font-black text-xl text-slate-900 uppercase leading-tight">{s.role}</h4>
                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Exp: {s.experience} Years • 📍 {s.location}</p>
                            </div>
                            <div className="text-right bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                                <span className="text-sm font-black text-emerald-600 block leading-none">{s.budget}</span>
                                <p className="text-[7px] font-black text-emerald-400 uppercase tracking-tighter">Budget</p>
                            </div>
                        </div>

                        
                        <div className="bg-slate-50/80 p-4 rounded-[1.5rem] border border-slate-100 mb-5">
                            <div className="flex items-start gap-2 mb-2">
                                <span className="text-xs mt-0.5">🏆</span>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Past Completed Work</p>
                                    <p className="text-[10px] font-black text-slate-700 uppercase leading-tight">
                                        {s.pastWork || "Work History Not Updated"}
                                    </p>
                                </div>
                            </div>
                            <div className="border-t border-slate-200/50 mt-2 pt-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">Description & Location</p>
                                <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed italic">"{s.fullAddress}"</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <a href={`tel:${s.contact}`} className="bg-white border-2 border-slate-100 text-slate-900 text-center py-3.5 rounded-2xl font-black text-[10px] uppercase active:scale-95 shadow-sm flex items-center justify-center gap-2">📞 Call Now</a>
                            <button onClick={() => {setView('chat'); setActiveChat({email: s.ownerEmail, name: s.ownerName, phone: s.contact});}} className="bg-blue-600 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-100 active:scale-95 flex items-center justify-center gap-2">💬 Chat Now</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
function SocialForm({ user, setView, API_URL, fetchData }) {
    const [image, setImage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!image) return alert("Professional Photo is mandatory!");
    
      setLoading(true);
      try {
        
        const cloudinaryUrl = await uploadToCloudinary(image);
        
        if (!cloudinaryUrl) {
            setLoading(false);
            return alert("Image upload failed! Check server.");
        }

        const d = Object.fromEntries(new FormData(e.target));
        const end = user.role === 'Worker' ? 'worker-profile' : 'jobs';

        
        const res = await fetch(`${API_URL}/${end}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...d,
                image: cloudinaryUrl,
                ownerEmail: user.email,
                ownerName: user.name,
                ownerPic: user.profilePic || "",
                contact: user.contact,
                email: user.email
            })
        });

        if (res.ok) {
            await fetchData(); 
            setShowSuccess(true);
        }
      } catch (err) {
        alert("Connection error!");
      } finally {
        setLoading(false);
      }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-normal">
            <div className="max-w-xl w-full bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
                <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tighter text-slate-800 border-b-4 border-blue-600 inline-block pb-1 w-full">
                    {user.role === 'Worker' ? 'Worker Profile Form' : 'Post A New Job'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Full Name</label>
                        <input name="name" defaultValue={user.name} placeholder="Your Name" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 outline-none text-sm uppercase" required />
                    </div>

                    
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{user.role === 'Worker' ? 'Your Main Skill' : 'Job Title'}</label>
                        <input name={user.role === 'Worker' ? 'skill' : 'title'} placeholder={user.role === 'Worker' ? "e.g. Electrician, Plumber" : "e.g. Need Delivery Boy"} className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 outline-none text-sm uppercase" required />
                    </div>

                    
                    <div className="w-full h-40 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden bg-slate-50 group hover:border-blue-400 transition-all">
                        {image ? <img src={image} className="absolute inset-0 w-full h-full object-cover" alt="p" /> : <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📸 Upload Profile Photo</p>}
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                            const r = new FileReader(); r.readAsDataURL(e.target.files[0]);
                            r.onloadend = () => setImage(r.result);
                        }} required />
                    </div>

                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{user.role === 'Worker' ? 'Expected Salary' : 'Offered Salary'}</label>
                            <input name={user.role === 'Worker' ? 'expectedSalary' : 'salary'} placeholder="₹ Amount" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 text-sm" required />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Working Location</label>
                            <input name="location" placeholder="City Name" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 text-sm uppercase" required />
                        </div>
                    </div>

                    
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">{user.role === 'Worker' ? 'Work Experience' : 'Job Description'}</label>
                        <textarea name={user.role === 'Worker' ? 'experience' : 'description'} placeholder={user.role === 'Worker' ? "Write about your past work..." : "Describe the job requirements..."} className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold h-28 border border-slate-200 outline-none focus:border-blue-400 text-sm" required />
                    </div>

                    <button disabled={loading} className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95 uppercase tracking-widest ${loading ? 'bg-slate-300' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                        {loading ? "Please Wait..." : "Publish Now 🚀"}
                    </button>
                    
                    <button type="button" onClick={() => setView('feed')} className="w-full text-slate-400 font-bold text-[10px] uppercase tracking-widest">Cancel</button>
                </form>
            </div>

            
            {showSuccess && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[200] flex items-center justify-center p-6 text-center">
                    <div className="bg-white p-10 rounded-[3rem] max-w-sm w-full shadow-2xl border-[8px] border-white animate-slideUp">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-5 font-bold">✓</div>
                        <h3 className="text-xl font-black uppercase text-slate-800 mb-4">Profile Published Successfully!</h3>
                        
                        <div className="text-[12px] text-slate-500 font-bold leading-relaxed space-y-3 uppercase tracking-tight">
                            <p>Your worker profile is now live.</p>
                            <p className="text-blue-600">Businesses in your city can now contact you directly.</p>
                            <p className="border-t pt-3 mt-3">Manage or <span className="text-rose-500">Delete</span> this post from your Profile section.</p>
                        </div>

                        <button onClick={() => { setShowSuccess(false); setView('profile'); }} className="mt-8 w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg active:scale-95 hover:bg-blue-700 transition-all">
                            Check My Profile
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function LangScreen({ setLang }) {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-fadeIn font-normal">
        <h1 className="text-3xl font-black text-slate-900 mb-10 tracking-tighter uppercase leading-none">
            UDYOG SAATHI
        </h1>
        <div className="flex flex-col gap-4">
          <button 
            onClick={() => {setLang('en'); localStorage.setItem('udyogLang','en');}} 
            className="w-full bg-blue-600 text-white py-5 rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 uppercase"
          >
            ENGLISH
          </button>
          <button 
            onClick={() => {setLang('hi'); localStorage.setItem('udyogLang','hi');}} 
            className="w-full bg-slate-100 text-slate-900 py-5 rounded-2xl font-bold text-xl hover:bg-slate-200 transition-all shadow-lg active:scale-95 uppercase"
          >
            हिन्दी
          </button>
        </div>
      </div>
    </div>
  );
}
function AuthScreen({ onLogin }) {
  const [role, setRole] = useState(null); 
  const [mode, setMode] = useState('login');
  const [error, setError] = useState("");
  const [previewImg, setPreviewImg] = useState(""); 
  const [loading, setLoading] = useState(false); 

  const BASE_URL = "http://localhost:5000/api"; 

  const handlePhoneInput = (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  };

  const validateAndSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    
    if (mode === 'signup' && !previewImg) {
      setError("⚠️ please upload a profile photo!");
      setLoading(false);
      return;
    }

    try {
      let finalPic = "";
      
      
      if (mode === 'signup' && previewImg) {
        const cloudRes = await uploadToCloudinary(previewImg);
        if (!cloudRes) {
          setError("⚠️ photo upload failed!");
          setLoading(false);
          return;
        }
        finalPic = cloudRes;
      }

      
      const targetUrl = `${BASE_URL}/${mode}`;
      const res = await fetch(targetUrl, {
        method: 'POST', 
        headers: {'Content-Type': 'application/json'}, 
        body: JSON.stringify({
          ...data, 
          role, 
          profilePic: finalPic 
        })
      });

      const r = await res.json(); 
      if(res.ok) { 
        if(mode === 'login') onLogin(r.user); 
        else { 
          setMode('login'); 
          setPreviewImg("");
          alert("Account Created! Now Login."); 
        }
      } else {
        setError("⚠️ " + (r.error || "access denied!"));
      }
    } catch (err) {
      setError("⚠️ server connection failed!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-6 text-center">
      <div className="bg-white p-10 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-slideUp font-normal">
        {!role ? (
          <div>
            <h1 className="text-3xl font-black mb-10 tracking-tighter uppercase text-slate-900 leading-none">
                CHOOSE ROLE
            </h1>
            <div className="flex flex-col gap-4">
              <button onClick={() => setRole('Worker')} className="w-full bg-blue-50 text-slate-900 py-6 rounded-2xl font-bold text-lg hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-95 uppercase">WORKER 👷</button>
              <button onClick={() => setRole('Business')} className="w-full bg-[#1e293b] text-white py-6 rounded-2xl font-bold text-lg hover:bg-blue-600 transition-all shadow-md active:scale-95 uppercase">BUSINESS 🏢</button>
            </div>
          </div>
        ) : (
          <form onSubmit={validateAndSubmit} className="text-left font-normal">
            <h2 className="text-[12px] font-black mb-8 text-blue-600 uppercase tracking-widest text-center underline underline-offset-8 decoration-2">
                {role} {mode === 'login' ? 'LOGIN' : 'SIGNUP'}
            </h2>

            <div className="space-y-4">
              {mode === 'signup' && (
                <>
                  
                  <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-200 overflow-hidden relative bg-slate-50 group">
                      {previewImg ? (
                        <img src={previewImg} className="w-full h-full object-cover" alt="p" />
                      ) : (
                        <span className="text-[20px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">📸</span>
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={e => {
                          const r = new FileReader(); 
                          r.readAsDataURL(e.target.files[0]);
                          r.onloadend = () => setPreviewImg(r.result);
                        }} 
                      />
                    </div>
                    <p className="text-[8px] font-black text-slate-400 uppercase mt-2">Upload Profile Photo</p>
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Full Name</label>
                    <input name="name" placeholder="John Doe" className="w-full p-4 bg-slate-50 rounded-xl font-bold border border-slate-100 outline-none focus:border-blue-400 transition-all text-sm" required />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Mobile</label>
                    <input name="contact" onInput={handlePhoneInput} placeholder="9898XXXXXX" className="w-full p-4 bg-slate-50 rounded-xl font-bold border border-slate-100 outline-none focus:border-blue-400 transition-all text-sm" required />
                  </div>
                </>
              )}
              
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Email</label>
                <input name="email" type="email" placeholder="name@email.com" className="w-full p-4 bg-slate-50 rounded-xl font-bold border border-slate-100 outline-none focus:border-blue-400 transition-all text-sm" required />
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Password</label>
                <input name="password" type="password" placeholder="Min. 6 chars + 1 number" className="w-full p-4 bg-slate-50 rounded-xl font-bold border border-slate-100 outline-none focus:border-blue-400 transition-all text-sm" required />
                
                {error && <p className="text-[10px] text-red-500 font-bold mt-2 ml-1 lowercase italic">{error}</p>}
              </div>
            </div>

            <button 
              disabled={loading}
              className={`w-full py-4 rounded-xl font-black text-sm uppercase shadow-xl mt-10 transition-all active:scale-95 ${
                loading ? 'bg-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
              }`}
            >
                {loading ? 'Please Wait...' : mode === 'login' ? 'ENTER PLATFORM' : 'CREATE ACCOUNT'}
            </button>
            
            <p className="mt-8 text-center text-[10px] font-black text-slate-400 cursor-pointer underline uppercase tracking-widest hover:text-blue-600" onClick={() => {setMode(mode==='login'?'signup':'login'); setError("");}}>
                {mode==='login' ? "Join Network" : "Back to Login"}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function AIModal({ setShowAI, aiChat, setAIChat, user, API_URL }) {
    const [isTyping, setIsTyping] = useState(false);

    const ask = async (e) => {
      e.preventDefault(); 
      const q = e.target.query.value; 
      if(!q) return;

      const newChat = [...aiChat, {role:'user', text:q}];
      setAIChat(newChat); 
      e.target.reset();
      setIsTyping(true);

      try {
          const res = await fetch(`${API_URL}/career-guidance`, {
              method:'POST', 
              headers:{'Content-Type':'application/json'}, 
              body:JSON.stringify({userDetails:user, query:q,lang: localStorage.getItem('udyogLang')})
          });
          const data = await res.json(); 
          setAIChat([...newChat, {role:'ai', text:data.aiReply}]);
      } catch (err) {
          console.error("AI Sync Error");
      } finally {
          setIsTyping(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-slideUp flex flex-col h-[75vh] border-[6px] border-white font-normal">
            
            
            <div className="p-6 border-b flex justify-between items-center bg-white sticky top-0 shadow-sm z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl shadow-lg">🤖</div>
                    <div>
                        <h3 className="font-black text-lg uppercase tracking-tighter text-slate-800">AI Career Mentor</h3>
                        <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Always Online</p>
                    </div>
                </div>
                <button 
                    onClick={() => setShowAI(false)} 
                    className="bg-slate-100 text-slate-600 px-5 py-2 rounded-full font-bold text-[10px] uppercase hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                >
                    Done
                </button>
            </div>

            
            <div className="flex-grow p-6 overflow-y-auto space-y-6 bg-slate-50/50 custom-scrollbar">
                {aiChat.length === 0 && (
                    <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                        <span className="text-5xl">✨</span>
                        <p className="font-black uppercase tracking-[0.3em] text-sm">Ask me anything about your career</p>
                    </div>
                )}
                
                {aiChat.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                        <div className={`max-w-[85%] p-4 rounded-3xl font-bold text-[13px] shadow-sm leading-relaxed ${
                            m.role === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-none shadow-blue-100' 
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
                        }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                
                {isTyping && (
                    <div className="flex justify-start animate-pulse">
                        <div className="bg-slate-200 px-4 py-2 rounded-full text-[10px] font-bold uppercase text-slate-500">
                            Mentor is thinking...
                        </div>
                    </div>
                )}
            </div>

            
            <form onSubmit={ask} className="p-5 bg-white border-t flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                <input 
                    name="query" 
                    placeholder="Type your question here..." 
                    autoComplete="off"
                    className="flex-grow p-4 bg-slate-100 rounded-2xl outline-none font-bold text-sm shadow-inner focus:border-blue-400 transition-all" 
                    required 
                />
                <button className="bg-blue-600 text-white px-8 rounded-2xl font-black text-[11px] uppercase shadow-lg hover:bg-blue-700 active:scale-90 transition-all font-bold">
                    Ask
                </button>
            </form>
        </div>
      </div>
    );
}

function InstaChat({ apps, user, activeChat, setActiveChat, chatHistory, API_URL }) {
    const approvedChats = apps ? apps.filter(a => a.status === 'approved') : [];

    return (
        <div className="h-[82vh] flex flex-col bg-white border rounded-[2.5rem] overflow-hidden shadow-2xl animate-fadeIn font-bold">
            <div className="flex-grow overflow-y-auto p-4 space-y-3 custom-scrollbar text-center font-bold">
                {!activeChat ? (
                    <>
                        <h3 className="font-black text-2xl border-b pb-4 mb-4 uppercase tracking-tighter underline decoration-blue-600 decoration-8 underline-offset-8">
                            Messages Hub 📥
                        </h3>
                        {approvedChats.map(a => {
                            const isBusiness = user.email === a.businessEmail;
                            
                           
                            const target = isBusiness 
                                ? { e: a.applicantEmail, n: a.applicantName, p: a.applicantContact, pic: a.applicantPic } 
                                : { e: a.businessEmail, n: a.ownerName || "Post Owner", p: a.ownerContact, pic: a.ownerPic };
                            
                            return (
                                <div 
                                    key={a._id} 
                                    onClick={() => setActiveChat({ email: target.e, name: target.n, phone: target.p, pic: target.pic, appId: a._id })} 
                                    className="p-5 border-2 border-slate-50 rounded-3xl flex items-center gap-5 cursor-pointer hover:bg-blue-50 transition-all hover:scale-[1.02] shadow-sm group"
                                >
                                    
                                    <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0">
                                        <img 
                                            src={target.pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                                            className="w-full h-full object-cover" 
                                            alt="u" 
                                        />
                                    </div>

                                    <div className="flex-grow text-left">
                                        <p className="font-black text-[16px] uppercase tracking-tighter leading-none text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {target.n}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">
                                            Project: {a.jobTitle || a.title}
                                        </p>
                                    </div>
                                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
                                </div>
                            );
                        })}
                    </>
                ) : (
                    <div className="flex flex-col h-full bg-[#fdfdfd]">
                       
                        <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10 sticky top-0">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setActiveChat(null)} className="text-2xl p-2 font-black hover:text-blue-600 transition-colors">←</button>
                                <div className="w-10 h-10 rounded-full overflow-hidden border">
                                    <img src={activeChat.pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className="w-full h-full object-cover" alt="p" />
                                </div>
                                <h4 className="font-black uppercase text-lg tracking-tighter">{activeChat.name}</h4>
                            </div>
                            <a href={`tel:${activeChat.phone}`} className="bg-blue-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase shadow-lg active:scale-95 border-b-4 border-blue-800">Call</a>
                        </div>

                        
                        <div className="flex-grow overflow-y-auto p-6 flex flex-col gap-4 custom-scrollbar bg-slate-50/20">
                            {chatHistory.map((m, i) => (
                                <div 
                                    key={i} 
                                    className={`p-4 rounded-[2rem] max-w-[85%] font-bold shadow-sm leading-relaxed transition-all hover:scale-[1.02] text-[14px] ${
                                        m.senderEmail === user.email 
                                            ? 'bg-blue-600 text-white self-end rounded-tr-none shadow-blue-200 border-b-4 border-blue-700' 
                                            : 'bg-white text-slate-800 self-start rounded-tl-none border-2 border-slate-100 shadow-sm'
                                    }`}
                                >
                                    {m.text}
                                </div>
                            ))}
                        </div>

                        
                        <form onSubmit={async e => {
                            e.preventDefault(); 
                            const txt = e.target.msg.value; 
                            if(!txt) return;
                            await fetch(`${API_URL}/send-message`, {
                                method: 'POST', 
                                headers: { 'Content-Type': 'application/json' }, 
                                body: JSON.stringify({ senderEmail: user.email, receiverEmail: activeChat.email, text: txt })
                            });
                            e.target.reset();
                        }} className="p-5 bg-white border-t-2 border-slate-50 flex gap-4 shadow-lg relative z-10">
                            <input name="msg" autoComplete="off" placeholder="Write message..." className="flex-grow p-4 bg-slate-50 rounded-full font-black text-sm outline-none border-none shadow-inner focus:ring-[10px] focus:ring-blue-50 transition-all" />
                            <button className="bg-slate-950 text-white px-10 rounded-full font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all border-b-4 border-slate-800">SEND</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

function InstaNotif({ notifications, user, API_URL, fetchData, setView }) {
  const myNotifs = notifications.filter(n => 
    n.businessEmail === user.email || 
    n.toEmail === user.email || 
    n.applicantEmail === user.email || 
    n.fromEmail === user.email
  );

  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`${API_URL}/application-status/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action })
      });
      if (res.ok) {
        alert(`Request ${action === 'approved' ? 'Accepted' : 'Declined'}!`);
        fetchData();
      }
    } catch (err) { alert("Error updating status!"); }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-normal max-w-2xl mx-auto px-2 md:px-0">
      <div className="flex justify-between items-center border-b-4 border-blue-600 pb-2">
        <h2 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter">
            Notifications ({myNotifs.length})
        </h2>
      </div>

      {myNotifs.length === 0 ? (
        <div className="bg-white p-10 md:p-20 rounded-[2.5rem] text-center border-2 border-dashed border-slate-100 shadow-sm mt-4">
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">No new requests yet</p>
        </div>
      ) : (
        <div className="space-y-4 mt-4">
          {myNotifs.map((n) => {
            const isSentByMe = (n.applicantEmail === user.email || n.fromEmail === user.email);
            
            return (
              <div key={n._id} className="bg-white p-4 md:p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col gap-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-3 w-full">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-slate-100 overflow-hidden bg-slate-50 flex-shrink-0 shadow-sm">
                    <img 
                      src={isSentByMe ? (n.ownerPic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png") : (n.applicantPic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png")} 
                      className="w-full h-full object-cover"
                      alt="u" 
                    />
                  </div>

                  <div className="flex-1 min-w-0"> 
                    <p className="text-[12px] md:text-[13px] font-black uppercase text-slate-800 leading-tight break-words">
                      {isSentByMe ? (
                        <>You applied for <span className="text-blue-600">{n.jobTitle || n.title}</span></>
                      ) : (
                        <><span className="text-blue-600">{n.applicantName || n.fromName}</span> applied for <span className="text-slate-500">{n.jobTitle || n.title}</span></>
                      )}
                    </p>
                    
                    <div className="inline-block mt-2">
                        <p className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${
                            n.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                            n.status === 'declined' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                            'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                            Status: {n.status || 'Pending'}
                        </p>
                    </div>
                  </div>
                </div>

                <div className="w-full pt-2 border-t border-slate-50">
                    {!isSentByMe && (!n.status || n.status === 'pending') && (
                    <div className="flex gap-2">
                        <button onClick={() => handleAction(n._id, 'approved')} className="flex-1 bg-emerald-500 text-white py-3 rounded-xl text-[9px] font-black uppercase shadow-lg active:scale-95 transition-all">Accept</button>
                        <button onClick={() => handleAction(n._id, 'declined')} className="flex-1 bg-rose-50 text-rose-500 py-3 rounded-xl text-[9px] font-black uppercase active:scale-95 border border-rose-100">Decline</button>
                    </div>
                    )}
                    
                    {n.status === 'approved' && (
                    <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 py-3 rounded-xl font-black text-[9px] uppercase border border-emerald-100">
                        <span>✓</span> {isSentByMe ? "Accepted" : "Hired"}
                    </div>
                    )}

                    {n.status === 'declined' && (
                    <div className="w-full flex items-center justify-center gap-2 bg-rose-50 text-rose-600 py-3 rounded-xl font-black text-[9px] uppercase border border-rose-100">
                        <span>✕</span> Rejected
                    </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function InstantForm({ user, setView, API_URL, fetchData }) {
    const [image, setImage] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!image) return alert("Photo is mandatory for Instant Service!");
      
      setLoading(true); 
    
      
      const cloudinaryUrl = await uploadToCloudinary(image);
    
      if (!cloudinaryUrl) {
        setLoading(false);
        return alert("Image upload failed!");
      }

     
      const d = Object.fromEntries(new FormData(e.target));
      
      
      try {
          const res = await fetch(`${API_URL}/post-instant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                ...d, 
                image: cloudinaryUrl, 
                ownerEmail: user.email,
                ownerName: user.name,        
                ownerPic: user.profilePic,   
                contact: user.contact,
                location: d.location
            })
          });

          if(res.ok) {
              await fetchData(); 
              setShowSuccess(true);
          }
      } catch (err) {
          alert("Server Error!");
      } finally {
          setLoading(false);
      }
    };

    return (
        <div className="max-w-xl mx-auto bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-slate-100 font-normal">
            <h2 className="text-2xl font-black text-center mb-8 uppercase tracking-tighter text-slate-800 border-b-4 border-blue-600 inline-block pb-1 w-full">
                New Instant Service ⚡
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Service Name</label>
                        <input name="role" placeholder="e.g. Plumber, Driver" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 outline-none text-sm uppercase" required />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Experience (Years)</label>
                        <input name="experience" type="number" placeholder="Years of exp" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 text-sm" required />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Budget (Min to Max)</label>
                        <input name="budget" placeholder="e.g. ₹500 - ₹2000" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 text-sm" required />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Service Locations</label>
                        <input name="location" placeholder="Cities you serve" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 text-sm uppercase" required />
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Past Completed Work</label>
                    <input name="pastWork" placeholder="e.g. 50+ house repairs done" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-200 text-sm uppercase" required />
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Full Address & Description</label>
                    <textarea name="fullAddress" placeholder="Describe your service and full address..." className="w-full p-5 bg-slate-50 rounded-[2rem] font-bold h-28 border border-slate-200 outline-none text-sm" required />
                </div>

                <div className="w-full h-32 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center relative overflow-hidden bg-slate-50 group">
                    {image ? <img src={image} className="absolute inset-0 w-full h-full object-cover" alt="p" /> : <p className="text-[10px] font-black text-slate-400 uppercase">📸 Upload Your Photo</p>}
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => {
                        const r = new FileReader(); r.readAsDataURL(e.target.files[0]);
                        r.onloadend = () => setImage(r.result);
                    }} required />
                </div>

                <button disabled={loading} className={`w-full py-5 rounded-[2rem] font-black text-xl shadow-xl transition-all active:scale-95 uppercase tracking-widest ${loading ? 'bg-slate-300' : 'bg-slate-900 text-white hover:bg-blue-600'}`}>
                    {loading ? "Please Wait..." : "Go Live ⚡"}
                </button>
            </form>

            {showSuccess && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-slate-900/40" onClick={() => setView('profile')}></div>
                    <div className="bg-white p-8 rounded-[3rem] w-full max-w-[340px] shadow-2xl relative z-[10000] text-center border-[8px] border-white animate-slideUp">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-5 font-bold">✓</div>
                        <h3 className="text-xl font-black uppercase text-slate-800 mb-3 tracking-tighter">Successfully Uploaded!</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-8 leading-tight">
                            You can delete and manage it from your profile.
                        </p>
                        <button onClick={() => { setShowSuccess(false); setView('profile'); }} className="w-full bg-slate-950 text-white py-4 rounded-2xl font-black uppercase active:scale-95">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;