import React, { useState } from 'react';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { User, Mail, Calendar, Shield, Edit, Camera, Trophy } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    email: user?.email || '',
    language: user?.language || 'en',
    avatar_url: user?.avatar_url || ''
  });

  const handleSave = () => {
    // Save profile logic would go here
    setIsEditing(false);
    toast({
      title: "Profile Updated",
      description: "Your profile has been updated successfully.",
    });
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'creator':
        return 'bg-blue-100 text-blue-800';
      case 'narrator':
        return 'bg-green-100 text-green-800';
      case 'end_user':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role) => {
    switch (role) {
      case 'end_user':
        return 'Student/Parent/Teacher';
      case 'creator':
        return 'Story Creator';
      case 'narrator':
        return 'Voice Narrator';
      case 'admin':
        return 'Administrator';
      default:
        return role;
    }
  };

  const getInitials = (email) => {
    return email ? email.substring(0, 2).toUpperCase() : 'U';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <User className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsEditing(!isEditing)}
          className="flex items-center"
        >
          <Edit className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile Picture and Basic Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profileData.avatar_url} />
                <AvatarFallback className="text-lg">
                  {getInitials(user?.email)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <Button 
                  size="sm" 
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  variant="outline"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            <div className="text-center">
              <h3 className="font-semibold text-lg">{user?.email?.split('@')[0]}</h3>
              <Badge className={getRoleBadgeColor(user?.role)}>
                {getRoleDisplayName(user?.role)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Profile Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </Label>
                <Input
                  id="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  disabled={!isEditing}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="language">Language Preference</Label>
                <Input
                  id="language"
                  value={profileData.language === 'en' ? 'English' : 'العربية'}
                  disabled
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Member Since
                </Label>
                <div className="mt-1 text-sm text-gray-600">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              
              <div>
                <Label className="flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Account Status
                </Label>
                <div className="mt-1">
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Active
                  </Badge>
                </div>
              </div>
            </div>

            {isEditing && (
              <>
                <Separator />
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
                    Save Changes
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Role-specific Information */}
      {user?.role === 'end_user' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              Learning Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-500">0</div>
                <div className="text-sm text-gray-600">Stories Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">0</div>
                <div className="text-sm text-gray-600">Words Learned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">0</div>
                <div className="text-sm text-gray-600">Badges Earned</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {user?.role === 'creator' && (
        <Card>
          <CardHeader>
            <CardTitle>Creator Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-orange-500">0</div>
                <div className="text-sm text-gray-600">Stories Created</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-500">0</div>
                <div className="text-sm text-gray-600">Published Stories</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-500">0</div>
                <div className="text-sm text-gray-600">Total Views</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Profile;