import React, { useState } from 'react';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Settings as SettingsIcon, User, Globe, Bell, Shield, Palette } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    language: user?.language || 'en',
    notifications: true,
    autoPlay: true,
    theme: 'light',
    volume: 80
  });

  const handleSave = () => {
    // Save settings logic would go here
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const getRoleSpecificSettings = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Admin Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="content-moderation">Content Moderation</Label>
                <Switch id="content-moderation" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="analytics-sharing">Analytics Sharing</Label>
                <Switch id="analytics-sharing" />
              </div>
              <div>
                <Label htmlFor="backup-frequency">Backup Frequency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );
      case 'creator':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Creator Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="story-templates">Use Story Templates</Label>
                <Switch id="story-templates" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-save">Auto-save Drafts</Label>
                <Switch id="auto-save" defaultChecked />
              </div>
              <div>
                <Label htmlFor="default-age-group">Default Age Group</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4-6">Ages 4-6</SelectItem>
                    <SelectItem value="7-10">Ages 7-10</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        );
      case 'narrator':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                Narrator Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="audio-quality">Audio Quality</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="noise-reduction">Noise Reduction</Label>
                <Switch id="noise-reduction" defaultChecked />
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <SettingsIcon className="w-8 h-8 text-orange-500" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="language">Language</Label>
              <Select 
                value={settings.language} 
                onValueChange={(value) => setSettings({...settings, language: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select 
                value={settings.theme} 
                onValueChange={(value) => setSettings({...settings, theme: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="notifications">Enable Notifications</Label>
              <Switch 
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings({...settings, notifications: checked})}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-play">Auto-play Stories</Label>
              <Switch 
                id="auto-play"
                checked={settings.autoPlay}
                onCheckedChange={(checked) => setSettings({...settings, autoPlay: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Role-specific Settings */}
        {getRoleSpecificSettings()}

        <Separator />

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;