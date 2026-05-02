import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import ScrollToTop from "@/components/ScrollToTop";
import "@/App.css";

// Public pages
import Home from "@/pages/public/Home";
import Club from "@/pages/public/Club";
import Team from "@/pages/public/Team";
import Players from "@/pages/public/Players";
import PlayerDetail from "@/pages/public/PlayerDetail";
import TechnicalTeam from "@/pages/public/TechnicalTeam";
import MatchCenter from "@/pages/public/MatchCenter";
import Fixture from "@/pages/public/Fixture";
import Standings from "@/pages/public/Standings";
import News from "@/pages/public/News";
import NewsDetail from "@/pages/public/NewsDetail";
import Sponsors from "@/pages/public/Sponsors";
import Contact from "@/pages/public/Contact";
import Academy from "@/pages/public/Academy";
import AcademyAgeGroups from "@/pages/public/AcademyAgeGroups";
import AcademySchedule from "@/pages/public/AcademySchedule";
import AcademyTechnical from "@/pages/public/AcademyTechnical";
import AcademyNews from "@/pages/public/AcademyNews";
import AcademyApplication from "@/pages/public/AcademyApplication";

// Admin pages
import AdminLogin from "@/pages/admin/Login";
import AdminLayout from "@/components/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminPlayers from "@/pages/admin/Players";
import AdminStaff from "@/pages/admin/Staff";
import AdminMatches from "@/pages/admin/Matches";
import AdminStandings from "@/pages/admin/Standings";
import AdminSponsors from "@/pages/admin/Sponsors";
import AdminPosts from "@/pages/admin/Posts";
import AdminAcademyGroups from "@/pages/admin/AcademyGroups";
import AdminAcademySessions from "@/pages/admin/AcademySessions";
import AdminApplications from "@/pages/admin/Applications";
import AdminSlides from "@/pages/admin/Slides";
import AdminMessages from "@/pages/admin/Messages";
import AdminMedia from "@/pages/admin/Media";
import AdminAi from "@/pages/admin/AiPanel";
import AdminAiStudio from "@/pages/admin/AiStudio";
import AdminTeamPhotos from "@/pages/admin/TeamPhotos";
import AdminSettings from "@/pages/admin/Settings";
import AdminUsers from "@/pages/admin/Users";
import AdminAccount from "@/pages/admin/Account";
import AdminMackolik from "@/pages/admin/MackolikSync";
import AdminPaketim from "@/pages/admin/Paketim";

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <ScrollToTop />
                <Toaster position="top-right" richColors theme="dark" />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/kulup" element={<Club />} />
                    <Route path="/takim" element={<Team />} />
                    <Route path="/oyuncular" element={<Players />} />
                    <Route path="/oyuncular/:slug" element={<PlayerDetail />} />
                    <Route path="/teknik-ekip" element={<TechnicalTeam />} />
                    <Route path="/mac-merkezi" element={<MatchCenter />} />
                    <Route path="/fikstur" element={<Fixture />} />
                    <Route path="/puan-durumu" element={<Standings />} />
                    <Route path="/haberler" element={<News />} />
                    <Route path="/haberler/:slug" element={<NewsDetail />} />
                    <Route path="/sponsorlar" element={<Sponsors />} />
                    <Route path="/iletisim" element={<Contact />} />
                    <Route path="/akademi" element={<Academy />} />
                    <Route path="/akademi/yas-gruplari" element={<AcademyAgeGroups />} />
                    <Route path="/akademi/antrenman-takvimi" element={<AcademySchedule />} />
                    <Route path="/akademi/teknik-kadro" element={<AcademyTechnical />} />
                    <Route path="/akademi/haberler" element={<AcademyNews />} />
                    <Route path="/akademi/basvuru" element={<AcademyApplication />} />

                    {/* Admin */}
                    <Route path="/admin" element={<AdminLogin />} />
                    <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
                    <Route path="/admin/players" element={<AdminLayout><AdminPlayers /></AdminLayout>} />
                    <Route path="/admin/staff" element={<AdminLayout><AdminStaff /></AdminLayout>} />
                    <Route path="/admin/matches" element={<AdminLayout><AdminMatches /></AdminLayout>} />
                    <Route path="/admin/standings" element={<AdminLayout><AdminStandings /></AdminLayout>} />
                    <Route path="/admin/sponsors" element={<AdminLayout><AdminSponsors /></AdminLayout>} />
                    <Route path="/admin/posts" element={<AdminLayout><AdminPosts /></AdminLayout>} />
                    <Route path="/admin/academy-groups" element={<AdminLayout><AdminAcademyGroups /></AdminLayout>} />
                    <Route path="/admin/academy-sessions" element={<AdminLayout><AdminAcademySessions /></AdminLayout>} />
                    <Route path="/admin/applications" element={<AdminLayout><AdminApplications /></AdminLayout>} />
                    <Route path="/admin/slides" element={<AdminLayout><AdminSlides /></AdminLayout>} />
                    <Route path="/admin/messages" element={<AdminLayout><AdminMessages /></AdminLayout>} />
                    <Route path="/admin/media" element={<AdminLayout><AdminMedia /></AdminLayout>} />
                    <Route path="/admin/ai" element={<AdminLayout><AdminAi /></AdminLayout>} />
                    <Route path="/admin/ai-studio" element={<AdminLayout><AdminAiStudio /></AdminLayout>} />
                    <Route path="/admin/team-photos" element={<AdminLayout><AdminTeamPhotos /></AdminLayout>} />
                    <Route path="/admin/settings" element={<AdminLayout><AdminSettings /></AdminLayout>} />
                    <Route path="/admin/users" element={<AdminLayout><AdminUsers /></AdminLayout>} />
                    <Route path="/admin/account" element={<AdminLayout><AdminAccount /></AdminLayout>} />
                    <Route path="/admin/mackolik" element={<AdminLayout><AdminMackolik /></AdminLayout>} />
                    <Route path="/admin/paketim" element={<AdminLayout><AdminPaketim /></AdminLayout>} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
