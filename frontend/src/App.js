import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Howl } from 'howler';
import { Play, Pause, SkipBack, SkipForward, Volume2, User, Book, Mic, Home, Trophy, Coins, Settings, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Context for auth
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: userData } = response.data;
    
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    return userData;
  };

  const signup = async (email, password, role) => {
    const response = await axios.post(`${API}/auth/signup`, { email, password, role });
    const { access_token, user: userData } = response.data;
    
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Landing Page Component
const LandingPage = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="mb-8">
            <Book className="w-24 h-24 mx-auto text-orange-500 mb-4" />
            <h1 className="text-5xl font-bold text-gray-800 mb-4 font-serif">StoryBridge</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Interactive audio stories that make learning fun for children aged 4-10
            </p>
          </div>
          
          <div className="bg-green-100 border border-green-400 rounded-lg p-4 mb-8 inline-block">
            <p className="text-green-800 font-medium">✓ Works 100% offline after download</p>
          </div>
          
          <div className="space-y-4 max-w-md mx-auto">
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg rounded-xl"
            >
              Get Started
            </Button>
            <p className="text-sm text-gray-500">Join thousands of children learning through stories</p>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="pt-6">
              <Play className="w-12 h-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Interactive Stories</h3>
              <p className="text-gray-600">Audio-driven stories with engaging quizzes and vocabulary</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Coins className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Earn Rewards</h3>
              <p className="text-gray-600">Collect coins and badges for completing stories</p>
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6">
              <Volume2 className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Offline Learning</h3>
              <p className="text-gray-600">Learn anywhere, anytime - no internet required</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Auth Component
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('end_user');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, role);
      }
      
      toast({
        title: isLogin ? "Welcome back!" : "Account created!",
        description: "Redirecting to your dashboard...",
      });
      
      // Navigate based on role
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Book className="w-12 h-12 mx-auto text-orange-500 mb-2" />
          <CardTitle className="text-2xl">{isLogin ? 'Welcome Back' : 'Join StoryBridge'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            
            {!isLogin && (
              <div>
                <Label htmlFor="role">I am a...</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="end_user">Student/Parent/Teacher</SelectItem>
                    <SelectItem value="creator">Story Creator</SelectItem>
                    <SelectItem value="narrator">Voice Narrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
            
            <p className="text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-orange-500 hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Story Player Component
const StoryPlayer = ({ story, onComplete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [sound, setSound] = useState(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Mock audio - in real implementation, this would load from GridFS
    const mockAudio = new Howl({
      src: ['data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzqV3/DFdiABGnze7t+QQQ8OTaXl7apSGQpBnN7zv2oh'], 
      format: ['mp3'],
      onload: () => {
        setDuration(30); // Mock 30 second duration
      },
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onend: () => {
        setIsPlaying(false);
        setShowQuiz(true);
      }
    });
    
    setSound(mockAudio);
    
    return () => {
      if (mockAudio) {
        mockAudio.unload();
      }
    };
  }, [story]);

  const togglePlay = () => {
    if (sound) {
      if (isPlaying) {
        sound.pause();
      } else {
        sound.play();
      }
    }
  };

  const skipForward = () => {
    if (sound) {
      const newTime = Math.min(currentTime + 15, duration);
      sound.seek(newTime);
      setCurrentTime(newTime);
    }
  };

  const skipBackward = () => {
    if (sound) {
      const newTime = Math.max(currentTime - 15, 0);
      sound.seek(newTime);
      setCurrentTime(newTime);
    }
  };

  const handleQuizAnswer = (answer) => {
    const newAnswers = [...quizAnswers, answer];
    setQuizAnswers(newAnswers);
    
    if (currentQuizIndex < story.quizzes.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
    } else {
      // Quiz completed
      const correctAnswers = newAnswers.filter((answer, index) => {
        const quiz = story.quizzes[index];
        return answer === quiz.answer;
      }).length;
      
      const earnedCoins = 10 + (correctAnswers * 5); // 10 for story + 5 per correct answer
      setCoinsEarned(earnedCoins);
      
      toast({
        title: "Story Completed! 🎉",
        description: `You earned ${earnedCoins} coins!`,
      });
      
      setTimeout(() => {
        onComplete(earnedCoins);
      }, 2000);
    }
  };

  if (showQuiz && story.quizzes.length > 0) {
    const currentQuiz = story.quizzes[currentQuizIndex];
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Question {currentQuizIndex + 1} of {story.quizzes.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <p className="text-lg">{currentQuiz.question}</p>
              
              {currentQuiz.type === 'true_false' && (
                <div className="space-y-3">
                  <Button 
                    onClick={() => handleQuizAnswer(true)}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    True
                  </Button>
                  <Button 
                    onClick={() => handleQuizAnswer(false)}
                    className="w-full bg-red-500 hover:bg-red-600"
                  >
                    False
                  </Button>
                </div>
              )}
              
              {currentQuiz.type === 'multiple_choice' && (
                <div className="space-y-3">
                  {currentQuiz.options.map((option, index) => (
                    <Button 
                      key={index}
                      onClick={() => handleQuizAnswer(option)}
                      className="w-full"
                      variant="outline"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              )}
              
              {currentQuiz.type === 'fill_blank' && (
                <div className="space-y-3">
                  <Input 
                    placeholder="Type your answer..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleQuizAnswer(e.target.value);
                      }
                    }}
                  />
                  <Button onClick={(e) => {
                    const input = e.target.parentElement.querySelector('input');
                    handleQuizAnswer(input.value);
                  }}>
                    Submit Answer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{story.title}</CardTitle>
            <Badge variant="secondary">{story.age_group} years</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-8">
              <div className="bg-white rounded-lg p-8 mb-6 shadow-inner">
                <Book className="w-24 h-24 mx-auto text-orange-500 mb-4" />
                <p className="text-lg leading-relaxed text-gray-700">
                  {story.text}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-center space-x-4">
                  <Button onClick={skipBackward} variant="outline" size="lg">
                    <SkipBack className="w-6 h-6" />
                  </Button>
                  <Button onClick={togglePlay} size="lg" className="px-8">
                    {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                  </Button>
                  <Button onClick={skipForward} variant="outline" size="lg">
                    <SkipForward className="w-6 h-6" />
                  </Button>
                </div>
                
                <div className="max-w-md mx-auto">
                  <Progress value={(currentTime / duration) * 100} className="h-2" />
                  <div className="flex justify-between text-sm text-gray-500 mt-1">
                    <span>{Math.floor(currentTime)}s</span>
                    <span>{Math.floor(duration)}s</span>
                  </div>
                </div>
              </div>
            </div>
            
            {story.vocabulary.length > 0 && (
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-3">New Words in This Story</h3>
                <div className="flex flex-wrap justify-center gap-2">
                  {story.vocabulary.map((word, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {word}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Dashboard Components
const EndUserDashboard = () => {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [userProgress, setUserProgress] = useState([]);
  const [totalCoins, setTotalCoins] = useState(150); // Mock initial coins
  const [badges, setBadges] = useState(['Story Starter']); // Mock initial badges
  const [ageFilter, setAgeFilter] = useState('all');
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchStories();
    fetchProgress();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await axios.get(`${API}/stories`);
      setStories(response.data);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API}/progress/user`);
      setUserProgress(response.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const handleStoryComplete = (coinsEarned) => {
    setTotalCoins(totalCoins + coinsEarned);
    setSelectedStory(null);
    
    // Check for new badges
    const completedStories = userProgress.filter(p => p.completed).length + 1;
    if (completedStories === 5 && !badges.includes('Word Wizard')) {
      setBadges([...badges, 'Word Wizard']);
      toast({
        title: "New Badge Earned! 🏆",
        description: "Word Wizard - Complete 5 stories",
      });
    }
  };

  const filteredStories = stories.filter(story => 
    ageFilter === 'all' || story.age_group === ageFilter
  );

  if (selectedStory) {
    return <StoryPlayer story={selectedStory} onComplete={handleStoryComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Story Library</h1>
            <p className="text-gray-600">Choose a story to begin your adventure!</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-full">
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-700">{totalCoins}</span>
            </div>
            <div className="flex items-center space-x-2">
              {badges.map((badge, index) => (
                <Badge key={index} className="bg-purple-100 text-purple-800">
                  <Trophy className="w-4 h-4 mr-1" />
                  {badge}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Age Filter */}
        <div className="mb-6">
          <Select value={ageFilter} onValueChange={setAgeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by age" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ages</SelectItem>
              <SelectItem value="4-6">Ages 4-6</SelectItem>
              <SelectItem value="7-10">Ages 7-10</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stories Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStories.map((story) => {
            const progress = userProgress.find(p => p.story_id === story.id);
            const isCompleted = progress?.completed || false;
            
            return (
              <Card key={story.id} className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-6" onClick={() => setSelectedStory(story)}>
                  <div className="text-center">
                    <Book className="w-16 h-16 mx-auto text-orange-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{story.title}</h3>
                    <Badge variant="secondary" className="mb-3">{story.age_group} years</Badge>
                    
                    {isCompleted && (
                      <div className="flex items-center justify-center text-green-600 mb-2">
                        <Trophy className="w-4 h-4 mr-1" />
                        <span className="text-sm">Completed</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap justify-center gap-1 mb-4">
                      {story.vocabulary.slice(0, 3).map((word, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button className="w-full">
                      {isCompleted ? 'Play Again' : 'Start Story'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const CreatorDashboard = () => {
  const [stories, setStories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    text: '',
    language: 'en',
    age_group: '4-6',
    vocabulary: '',
    quizzes: ''
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchCreatorStories();
  }, []);

  const fetchCreatorStories = async () => {
    try {
      const response = await axios.get(`${API}/stories/creator`);
      setStories(response.data);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const storyData = {
        ...formData,
        vocabulary: formData.vocabulary.split(',').map(w => w.trim()),
        quizzes: formData.quizzes ? JSON.parse(formData.quizzes) : []
      };
      
      await axios.post(`${API}/stories`, storyData);
      
      toast({
        title: "Story created!",
        description: "Your story has been submitted for review.",
      });
      
      setShowForm(false);
      setFormData({
        title: '',
        text: '',
        language: 'en',
        age_group: '4-6',
        vocabulary: '',
        quizzes: ''
      });
      
      fetchCreatorStories();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create story. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Create New Story</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Story Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="age_group">Age Group</Label>
                    <Select value={formData.age_group} onValueChange={(value) => setFormData({...formData, age_group: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4-6">Ages 4-6</SelectItem>
                        <SelectItem value="7-10">Ages 7-10</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="text">Story Text</Label>
                  <Textarea
                    id="text"
                    value={formData.text}
                    onChange={(e) => setFormData({...formData, text: e.target.value})}
                    rows={8}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="vocabulary">Vocabulary Words (comma-separated)</Label>
                  <Input
                    id="vocabulary"
                    value={formData.vocabulary}
                    onChange={(e) => setFormData({...formData, vocabulary: e.target.value})}
                    placeholder="brave, sparrow, fly, courage"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quizzes">Quiz Questions (JSON format)</Label>
                  <Textarea
                    id="quizzes"
                    value={formData.quizzes}
                    onChange={(e) => setFormData({...formData, quizzes: e.target.value})}
                    rows={4}
                    placeholder='[{"type": "true_false", "question": "The sparrow was brave?", "answer": true}]'
                  />
                </div>
                
                <div className="flex space-x-4">
                  <Button type="submit">Create Story</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Creator Dashboard</h1>
            <p className="text-gray-600">Manage your stories and create new ones</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            Create New Story
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map((story) => (
            <Card key={story.id}>
              <CardContent className="p-6">
                <div className="text-center">
                  <Book className="w-12 h-12 mx-auto text-purple-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{story.title}</h3>
                  <Badge 
                    variant={story.status === 'published' ? 'default' : story.status === 'pending' ? 'secondary' : 'outline'}
                    className="mb-3"
                  >
                    {story.status}
                  </Badge>
                  <p className="text-sm text-gray-600 mb-3">
                    {story.text.substring(0, 100)}...
                  </p>
                  <div className="flex justify-center space-x-2">
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm">Delete</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

const NarratorDashboard = () => {
  const [stories, setStories] = useState([]);
  const [narrations, setNarrations] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [voiceText, setVoiceText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchStories();
    fetchNarrations();
  }, []);

  const fetchStories = async () => {
    try {
      const response = await axios.get(`${API}/stories?status=published`);
      setStories(response.data);
    } catch (error) {
      console.error('Error fetching stories:', error);
    }
  };

  const fetchNarrations = async () => {
    try {
      const response = await axios.get(`${API}/narrations/narrator`);
      setNarrations(response.data);
    } catch (error) {
      console.error('Error fetching narrations:', error);
    }
  };

  const handleSubmitNarration = async () => {
    if (!selectedStory) return;
    
    try {
      const formData = new FormData();
      formData.append('story_id', selectedStory.id);
      if (audioFile) {
        formData.append('audio', audioFile);
      }
      if (voiceText) {
        formData.append('text', voiceText);
      }
      
      await axios.post(`${API}/narrations`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      toast({
        title: "Narration submitted!",
        description: "Your narration has been added to the story.",
      });
      
      setSelectedStory(null);
      setAudioFile(null);
      setVoiceText('');
      fetchNarrations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit narration. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startVoiceRecording = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      
      recognition.onstart = () => {
        setIsRecording(true);
      };
      
      recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        setVoiceText(finalTranscript);
      };
      
      recognition.onend = () => {
        setIsRecording(false);
      };
      
      recognition.start();
    } else {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Narrator Dashboard</h1>
          <p className="text-gray-600">Add your voice to stories and bring them to life</p>
        </div>

        <Tabs defaultValue="stories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="stories">Stories to Narrate</TabsTrigger>
            <TabsTrigger value="narrations">My Narrations</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stories">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story) => {
                const hasNarration = narrations.some(n => n.story_id === story.id);
                
                return (
                  <Card key={story.id} className={selectedStory?.id === story.id ? 'ring-2 ring-blue-500' : ''}>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Mic className="w-12 h-12 mx-auto text-green-500 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{story.title}</h3>
                        <Badge variant="secondary" className="mb-3">{story.age_group} years</Badge>
                        {hasNarration && (
                          <Badge className="mb-3 bg-green-100 text-green-800">
                            Already Narrated
                          </Badge>
                        )}
                        <p className="text-sm text-gray-600 mb-4">
                          {story.text.substring(0, 100)}...
                        </p>
                        <Button 
                          onClick={() => setSelectedStory(story)}
                          disabled={hasNarration}
                        >
                          {hasNarration ? 'Narrated' : 'Select to Narrate'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {selectedStory && (
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle>Add Narration for: {selectedStory.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label>Story Text to Narrate:</Label>
                    <div className="bg-gray-50 p-4 rounded-lg mt-2">
                      <p className="text-gray-700">{selectedStory.text}</p>
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="audio">Upload Audio File</Label>
                      <Input
                        id="audio"
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setAudioFile(e.target.files[0])}
                        className="mt-2"
                      />
                    </div>
                    
                    <div>
                      <Label>Voice-to-Text</Label>
                      <div className="mt-2 space-y-2">
                        <Button
                          type="button"
                          onClick={startVoiceRecording}
                          disabled={isRecording}
                          variant="outline"
                        >
                          {isRecording ? 'Recording...' : 'Start Recording'}
                        </Button>
                        <Textarea
                          value={voiceText}
                          onChange={(e) => setVoiceText(e.target.value)}
                          placeholder="Or type the narration text here..."
                          rows={4}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-4">
                    <Button onClick={handleSubmitNarration}>
                      Submit Narration
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedStory(null)}>
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="narrations">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {narrations.map((narration) => {
                const story = stories.find(s => s.id === narration.story_id);
                
                return (
                  <Card key={narration.id}>
                    <CardContent className="p-6">
                      <div className="text-center">
                        <Volume2 className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{story?.title || 'Story'}</h3>
                        <Badge 
                          variant={narration.status === 'published' ? 'default' : narration.status === 'pending' ? 'secondary' : 'outline'}
                          className="mb-3"
                        >
                          {narration.status}
                        </Badge>
                        <div className="flex justify-center space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">Delete</Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Main Dashboard Router
const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const getDashboardComponent = () => {
    switch (user?.role) {
      case 'end_user':
        return <EndUserDashboard />;
      case 'creator':
        return <CreatorDashboard />;
      case 'narrator':
        return <NarratorDashboard />;
      default:
        return <EndUserDashboard />;
    }
  };

  return (
    <div className="relative">
      {/* Logout button */}
      <Button
        onClick={handleLogout}
        className="fixed top-4 right-4 z-50"
        variant="outline"
        size="sm"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Logout
      </Button>
      
      {getDashboardComponent()}
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Book className="w-16 h-16 mx-auto text-orange-500 mb-4 animate-spin" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  return user ? children : <Navigate to="/auth" replace />;
};

// Main App Component
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </div>
  );
}

export default App;