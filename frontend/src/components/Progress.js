import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress as ProgressBar } from './ui/progress';
import { Badge } from './ui/badge';
import WordCloud from 'react-wordcloud';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, BookOpen, Trophy, Target, Users, Share2, Download } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Progress = () => {
  const { user } = useAuth();
  const [progress, setProgress] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCoins, setTotalCoins] = useState(0);
  const [wordCloudData, setWordCloudData] = useState([]);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      const [progressRes, badgesRes] = await Promise.all([
        axios.get(`${API}/progress/user`),
        axios.get(`${API}/badges/user`)
      ]);
      
      const progressData = progressRes.data;
      setProgress(progressData);
      setBadges(badgesRes.data);
      
      // Calculate total coins
      const coins = progressData.reduce((sum, p) => sum + p.coins_earned, 0);
      setTotalCoins(coins);
      
      // Generate word cloud data from vocabulary learned
      const vocabMap = {};
      progressData.forEach(p => {
        p.vocabulary_learned?.forEach(vocab => {
          if (vocab.learned) {
            vocabMap[vocab.word] = (vocabMap[vocab.word] || 0) + vocab.repetitions;
          }
        });
      });
      
      const wordCloudWords = Object.entries(vocabMap).map(([word, count]) => ({
        text: word,
        value: count * 10 // Scale for better visualization
      }));
      
      setWordCloudData(wordCloudWords);
      setLoading(false);
    } catch (error) {
      console.error('Error loading progress:', error);
      setLoading(false);
    }
  };

  const getCompletionData = () => {
    const completed = progress.filter(p => p.completed).length;
    const total = progress.length;
    return [
      { name: 'Completed', value: completed, fill: '#22c55e' },
      { name: 'In Progress', value: total - completed, fill: '#f97316' }
    ];
  };

  const getWeeklyProgress = () => {
    // Mock weekly progress data
    return [
      { day: 'Mon', stories: 2, words: 15 },
      { day: 'Tue', stories: 1, words: 8 },
      { day: 'Wed', stories: 3, words: 22 },
      { day: 'Thu', stories: 2, words: 18 },
      { day: 'Fri', stories: 4, words: 30 },
      { day: 'Sat', stories: 1, words: 7 },
      { day: 'Sun', stories: 2, words: 14 }
    ];
  };

  const shareProgress = () => {
    // Mock share functionality
    alert('Progress shared with teacher!');
  };

  const downloadProgress = () => {
    // Mock download functionality
    alert('Progress report downloaded!');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <TrendingUp className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold">My Progress</h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={shareProgress} className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Show My Teacher
          </Button>
          <Button variant="outline" onClick={downloadProgress} className="flex items-center">
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stories Completed</p>
                <p className="text-2xl font-bold text-green-600">
                  {progress.filter(p => p.completed).length}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Words Learned</p>
                <p className="text-2xl font-bold text-blue-600">
                  {progress.reduce((sum, p) => sum + (p.vocabulary_learned?.filter(v => v.learned).length || 0), 0)}
                </p>
              </div>
              <Target className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Coins Earned</p>
                <p className="text-2xl font-bold text-yellow-600">{totalCoins}</p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Badges</p>
                <p className="text-2xl font-bold text-purple-600">{badges.length}</p>
              </div>
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Completion Circles */}
        <Card>
          <CardHeader>
            <CardTitle>Story Completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={getCompletionData()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {getCompletionData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center space-x-4 mt-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm">Completed</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
                <span className="text-sm">In Progress</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={getWeeklyProgress()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="stories" fill="#f97316" name="Stories" />
                <Bar dataKey="words" fill="#3b82f6" name="Words" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Word Cloud */}
      {wordCloudData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Words I've Learned</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ height: '300px' }}>
              <WordCloud
                words={wordCloudData}
                options={{
                  rotations: 2,
                  rotationAngles: [0, 90],
                  fontSizes: [20, 60],
                  colors: ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#ef4444']
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Badges</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {badges.map((badge, index) => (
                <div key={index} className="flex items-center p-4 bg-purple-50 rounded-lg">
                  <Trophy className="w-8 h-8 text-purple-600 mr-3" />
                  <div>
                    <div className="font-semibold">{badge.badge_type.replace('_', ' ').toUpperCase()}</div>
                    <div className="text-sm text-gray-600">
                      Earned {new Date(badge.earned_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Details */}
      <Card>
        <CardHeader>
          <CardTitle>Story Progress Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {progress.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">Story {index + 1}</div>
                  <div className="text-sm text-gray-600">
                    Time spent: {Math.floor(item.time_spent / 60)} minutes
                  </div>
                  <ProgressBar 
                    value={item.completed ? 100 : 60} 
                    className="mt-2 w-full"
                  />
                </div>
                <div className="ml-4">
                  {item.completed ? (
                    <Badge className="bg-green-100 text-green-800">Completed</Badge>
                  ) : (
                    <Badge variant="outline">In Progress</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Progress;