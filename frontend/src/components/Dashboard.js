import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { get, set } from 'idb-keyval';
import Papa from 'papaparse';
import { 
  Trophy, Coins, Book, Filter, Download, BarChart3, Users, CheckCircle, 
  XCircle, Clock, Edit3, Trash2, Plus, Play, Volume2, Mic, UserCheck,
  Calendar, Target, Award, TrendingUp, FileText, Globe2, Shield
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../App';
import { StoryPlayer } from '../App';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const STORAGE_KEYS = {
  STORY_PACKS: 'storybridge_story_packs',
  USER_PROGRESS: 'storybridge_user_progress'
};

// Enhanced End User Dashboard
export const EndUserDashboard = () => {
  const [stories, setStories] = useState([]);
  const [selectedStory, setSelectedStory] = useState(null);
  const [userProgress, setUserProgress] = useState([]);
  const [totalCoins, setTotalCoins] = useState(0);
  const [badges, setBadges] = useState([]);
  const [ageFilter, setAgeFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [analytics, setAnalytics] = useState(null);
  const [offlineStories, setOfflineStories] = useState([]);
  
  const { user, isOnline } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load from online API if available
      if (isOnline) {
        const [storiesRes, progressRes, analyticsRes] = await Promise.all([
          axios.get(`${API}/stories`),
          axios.get(`${API}/progress/user`),
          user.role === 'end_user' ? axios.get(`${API}/analytics/ngo`) : Promise.resolve({ data: null })
        ]);
        
        setStories(storiesRes.data);
        setUserProgress(progressRes.data);
        if (analyticsRes.data) setAnalytics(analyticsRes.data);
        
        // Cache stories for offline use
        await set(STORAGE_KEYS.STORY_PACKS, storiesRes.data);
        await set(STORAGE_KEYS.USER_PROGRESS, progressRes.data);
      } else {
        // Load from offline storage
        const cachedStories = await get(STORAGE_KEYS.STORY_PACKS) || [];
        const cachedProgress = await get(STORAGE_KEYS.USER_PROGRESS) || [];
        
        setStories(cachedStories);
        setUserProgress(cachedProgress);
        setOfflineStories(cachedStories);
      }
      
      // Calculate coins and badges from progress
      const totalCoinsEarned = userProgress.reduce((sum, p) => sum + (p.coins_earned || 0), 0);
      const allBadges = [...new Set(userProgress.flatMap(p => p.badges_earned || []))];
      
      setTotalCoins(totalCoinsEarned);
      setBadges(allBadges);
      
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load stories. Check your connection.",
        variant: "destructive",
      });
    }
  };

  const handleStoryComplete = async (coinsEarned, newBadges) => {
    setTotalCoins(prev => prev + coinsEarned);
    setBadges(prev => [...new Set([...prev, ...newBadges])]);
    setSelectedStory(null);
    
    // Show badge notifications
    newBadges.forEach(badge => {
      toast({
        title: "New Badge Earned! 🏆",
        description: `${badge} - Amazing progress!`,
      });
    });
    
    // Reload progress data
    await loadData();
  };

  const downloadForOffline = async (story) => {
    try {
      // In a real implementation, this would download audio files and images
      const storyPack = {
        ...story,
        downloaded_at: new Date().toISOString(),
        offline_available: true
      };
      
      const existingPacks = await get(STORAGE_KEYS.STORY_PACKS) || [];
      const updatedPacks = [...existingPacks.filter(p => p.id !== story.id), storyPack];
      await set(STORAGE_KEYS.STORY_PACKS, updatedPacks);
      
      toast({
        title: "Downloaded!",
        description: `"${story.title}" is now available offline.`,
      });
      
      setOfflineStories(updatedPacks);
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download story for offline use.",
        variant: "destructive",
      });
    }
  };

  const exportProgress = () => {
    const progressData = userProgress.map(p => ({
      story_title: stories.find(s => s.id === p.story_id)?.title || 'Unknown',
      completed: p.completed ? 'Yes' : 'No',
      time_spent_minutes: Math.round(p.time_spent / 60),
      vocabulary_learned: p.vocabulary_learned?.length || 0,
      coins_earned: p.coins_earned || 0,
      quiz_score: p.quiz_results ? `${p.quiz_results.filter(q => q.correct).length}/${p.quiz_results.length}` : '0/0'
    }));
    
    const csv = Papa.unparse(progressData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `storybridge_progress_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredStories = stories.filter(story => {
    const ageMatch = ageFilter === 'all' || story.age_group === ageFilter;
    const langMatch = languageFilter === 'all' || story.language === languageFilter;
    return ageMatch && langMatch;
  });

  if (selectedStory) {
    return <StoryPlayer story={selectedStory} onComplete={handleStoryComplete} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Status */}
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Book className="w-8 h-8 text-orange-500" />
              Story Library
              {!isOnline && <Badge variant="outline" className="text-orange-600">Offline Mode</Badge>}
            </h1>
            <p className="text-gray-600">Choose a story to begin your adventure!</p>
          </div>
          
          {/* Coins and Badges */}
          <div className="flex items-center space-x-4">
            <motion.div 
              className="flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <Coins className="w-5 h-5 text-yellow-600" />
              <span className="font-semibold text-yellow-700">{totalCoins}</span>
            </motion.div>
            
            <div className="flex items-center space-x-2">
              {badges.slice(0, 3).map((badge, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Badge className="bg-purple-100 text-purple-800">
                    <Trophy className="w-4 h-4 mr-1" />
                    {badge}
                  </Badge>
                </motion.div>
              ))}
              {badges.length > 3 && (
                <Badge variant="outline">+{badges.length - 3} more</Badge>
              )}
            </div>
          </div>
        </motion.div>

        {/* Filters and Actions */}
        <motion.div 
          className="flex flex-wrap gap-4 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
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
          
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              <SelectItem value="en">🇺🇸 English</SelectItem>
              <SelectItem value="ar">🇸🇦 العربية</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportProgress} variant="outline">
            <FileText className="w-4 h-4 mr-2" />
            Export Progress
          </Button>
        </motion.div>

        {/* Analytics for Teachers */}
        {analytics && user.role === 'end_user' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Class Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{analytics.active_users}</div>
                    <div className="text-sm text-gray-600">Active Learners</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{analytics.stories_completed}</div>
                    <div className="text-sm text-gray-600">Stories Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{analytics.avg_session_time}m</div>
                    <div className="text-sm text-gray-600">Avg. Session</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{analytics.vocab_retention_rate}%</div>
                    <div className="text-sm text-gray-600">Vocabulary Retention</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stories Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, staggerChildren: 0.1 }}
        >
          {filteredStories.map((story, index) => {
            const progress = userProgress.find(p => p.story_id === story.id);
            const isCompleted = progress?.completed || false;
            const isOffline = offlineStories.some(s => s.id === story.id);
            
            return (
              <motion.div
                key={story.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="cursor-pointer"
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6" onClick={() => setSelectedStory(story)}>
                    <div className="text-center">
                      <div className="relative mb-4">
                        <Book className="w-16 h-16 mx-auto text-orange-500" />
                        {isOffline && (
                          <Badge className="absolute -top-2 -right-2 bg-green-500">
                            <Download className="w-3 h-3" />
                          </Badge>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-semibold mb-2 line-clamp-2">{story.title}</h3>
                      
                      <div className="flex justify-center gap-2 mb-3">
                        <Badge variant="secondary">{story.age_group} years</Badge>
                        <Badge variant="outline">
                          {story.language === 'ar' ? '🇸🇦' : '🇺🇸'} {story.language.toUpperCase()}
                        </Badge>
                      </div>
                      
                      {isCompleted && (
                        <div className="flex items-center justify-center text-green-600 mb-2">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          <span className="text-sm font-medium">Completed</span>
                        </div>
                      )}
                      
                      {progress && (
                        <div className="mb-3">
                          <div className="text-xs text-gray-500 mb-1">
                            Progress: {progress.vocabulary_learned?.length || 0}/{story.vocabulary.length} words
                          </div>
                          <Progress 
                            value={((progress.vocabulary_learned?.length || 0) / story.vocabulary.length) * 100} 
                            className="h-2"
                          />
                        </div>
                      )}
                      
                      {/* Vocabulary Preview */}
                      <div className="flex flex-wrap justify-center gap-1 mb-4">
                        {story.vocabulary.slice(0, 3).map((word, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {word}
                          </Badge>
                        ))}
                        {story.vocabulary.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{story.vocabulary.length - 3}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Button className="w-full" size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          {isCompleted ? 'Play Again' : 'Start Story'}
                        </Button>
                        
                        {!isOffline && isOnline && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadForOffline(story);
                            }}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {filteredStories.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Book className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No stories found</h3>
            <p className="text-gray-500">Try adjusting your filters or check your connection.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// Enhanced Creator Dashboard
export const CreatorDashboard = () => {
  const [stories, setStories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    text: '',
    language: 'en',
    age_group: '4-6',
    vocabulary: '',
    quizzes: ''
  });
  const [validationResults, setValidationResults] = useState(null);
  
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

  const validateTRPS = (text, vocabulary) => {
    const words = text.toLowerCase().split(/\s+/);
    const vocabRepetitions = {};
    
    vocabulary.forEach(word => {
      const count = words.filter(w => w.includes(word.toLowerCase())).length;
      vocabRepetitions[word] = count;
    });
    
    const minRepetitions = Math.min(...Object.values(vocabRepetitions));
    const isCompliant = minRepetitions >= 7;
    
    return {
      compliant: isCompliant,
      minRepetitions,
      vocabRepetitions,
      totalWords: words.length
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const storyData = {
        ...formData,
        vocabulary: formData.vocabulary.split(',').map(w => w.trim()).filter(w => w),
        quizzes: formData.quizzes ? JSON.parse(formData.quizzes) : []
      };
      
      // Validate TPRS compliance
      const validation = validateTRPS(storyData.text, storyData.vocabulary);
      setValidationResults(validation);
      
      if (editingStory) {
        await axios.put(`${API}/stories/${editingStory.id}`, storyData);
        toast({
          title: "Story updated!",
          description: validation.compliant ? "Your story meets TPRS standards." : "Story saved but needs TPRS review.",
        });
      } else {
        await axios.post(`${API}/stories`, storyData);
        toast({
          title: "Story created!",
          description: validation.compliant ? "Your story is ready for publication!" : "Story submitted for review.",
        });
      }
      
      resetForm();
      fetchCreatorStories();
    } catch (error) {
      toast({
        title: "Error",
        description: error.response?.data?.detail || "Failed to save story. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (story) => {
    setEditingStory(story);
    setFormData({
      title: story.title,
      text: story.text,
      language: story.language,
      age_group: story.age_group,
      vocabulary: story.vocabulary.join(', '),
      quizzes: JSON.stringify(story.quizzes, null, 2)
    });
    setShowForm(true);
  };

  const handleDelete = async (storyId) => {
    if (window.confirm('Are you sure you want to delete this story?')) {
      try {
        await axios.delete(`${API}/stories/${storyId}`);
        toast({
          title: "Story deleted",
          description: "Story has been permanently removed.",
        });
        fetchCreatorStories();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete story. It may be published already.",
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      text: '',
      language: 'en',
      age_group: '4-6',
      vocabulary: '',
      quizzes: ''
    });
    setEditingStory(null);
    setShowForm(false);
    setValidationResults(null);
  };

  if (showForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit3 className="w-5 h-5" />
                {editingStory ? 'Edit Story' : 'Create New Story'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Story Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      required
                      placeholder="Enter an engaging title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age_group">Age Group *</Label>
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
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="language">Language *</Label>
                    <Select value={formData.language} onValueChange={(value) => setFormData({...formData, language: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                        <SelectItem value="ar">🇸🇦 العربية</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="vocabulary">Vocabulary Words * (comma-separated)</Label>
                    <Input
                      id="vocabulary"
                      value={formData.vocabulary}
                      onChange={(e) => setFormData({...formData, vocabulary: e.target.value})}
                      placeholder="brave, sparrow, fly, courage, garden"
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="text">Story Text *</Label>
                  <Textarea
                    id="text"
                    value={formData.text}
                    onChange={(e) => setFormData({...formData, text: e.target.value})}
                    rows={10}
                    required
                    placeholder="Write your story here. Remember to repeat vocabulary words at least 7 times each for TPRS compliance."
                    className="resize-none"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Word count: {formData.text.split(/\s+/).filter(w => w).length}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="quizzes">Quiz Questions (JSON format)</Label>
                  <Textarea
                    id="quizzes"
                    value={formData.quizzes}
                    onChange={(e) => setFormData({...formData, quizzes: e.target.value})}
                    rows={6}
                    placeholder='[{"type": "true_false", "question": "The sparrow was brave?", "answer": true}]'
                    className="font-mono text-sm resize-none"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Create 3-5 questions using types: "true_false", "multiple_choice", "fill_blank"
                  </div>
                </div>
                
                {/* TPRS Validation Results */}
                {validationResults && (
                  <Alert className={validationResults.compliant ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}>
                    <Target className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-2">
                        TPRS Compliance: {validationResults.compliant ? '✅ Compliant' : '⚠️ Needs Review'}
                      </div>
                      <div className="text-sm space-y-1">
                        <div>Minimum vocabulary repetitions: {validationResults.minRepetitions}/7</div>
                        <div>Vocabulary usage:</div>
                        <ul className="ml-4">
                          {Object.entries(validationResults.vocabRepetitions).map(([word, count]) => (
                            <li key={word} className={count >= 7 ? 'text-green-600' : 'text-orange-600'}>
                              "{word}": {count} times {count >= 7 ? '✅' : '❌'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="flex gap-4">
                  <Button type="submit" className="flex-1">
                    <Plus className="w-4 h-4 mr-2" />
                    {editingStory ? 'Update Story' : 'Create Story'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
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
        <motion.div 
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
              <Edit3 className="w-8 h-8 text-purple-500" />
              Creator Dashboard
            </h1>
            <p className="text-gray-600">Manage your stories and create new ones</p>
          </div>
          <Button onClick={() => setShowForm(true)} size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Create New Story
          </Button>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Stories</p>
                  <p className="text-2xl font-bold">{stories.length}</p>
                </div>
                <Book className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stories.filter(s => s.status === 'published').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Review</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {stories.filter(s => s.status === 'pending').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stories Grid */}
        <motion.div 
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, staggerChildren: 0.1 }}
        >
          {stories.map((story, index) => (
            <motion.div
              key={story.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -5 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="text-center">
                    <Book className="w-12 h-12 mx-auto text-purple-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2 line-clamp-2">{story.title}</h3>
                    
                    <div className="flex justify-center gap-2 mb-3">
                      <Badge 
                        variant={
                          story.status === 'published' ? 'default' : 
                          story.status === 'pending' ? 'secondary' : 
                          story.status === 'rejected' ? 'destructive' : 'outline'
                        }
                      >
                        {story.status === 'published' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {story.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                        {story.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
                        {story.status}
                      </Badge>
                      <Badge variant="outline">{story.age_group}</Badge>
                      <Badge variant="outline">
                        {story.language === 'ar' ? '🇸🇦' : '🇺🇸'}
                      </Badge>
                    </div>
                    
                    {story.tprs_score && (
                      <div className="mb-3">
                        <div className="text-sm text-gray-600 mb-1">TPRS Score</div>
                        <Progress value={story.tprs_score * 100} className="h-2" />
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.round(story.tprs_score * 100)}% compliant
                        </div>
                      </div>
                    )}
                    
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {story.text.substring(0, 120)}...
                    </p>
                    
                    <div className="flex flex-wrap justify-center gap-1 mb-4">
                      {story.vocabulary.slice(0, 4).map((word, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {word}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleEdit(story)}
                        className="flex-1"
                      >
                        <Edit3 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(story.id)}
                        className="flex-1"
                        disabled={story.status === 'published'}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {stories.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Edit3 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No stories yet</h3>
            <p className="text-gray-500 mb-4">Create your first story to get started!</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Story
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};