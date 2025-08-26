import React, { useState } from 'react';
import { useAuth } from '../App';
import { Button } from './ui/button';
import { 
  Home, User, Settings, TrendingUp, Book, Mic, Shield, Users, 
  BarChart3, ChevronLeft, ChevronRight, Menu
} from 'lucide-react';

const Sidebar = ({ currentView, onViewChange, isCollapsed, setIsCollapsed }) => {
  const { user } = useAuth();

  const getNavigationItems = () => {
    const commonItems = [
      { id: 'dashboard', icon: Home, label: 'Dashboard' },
      { id: 'profile', icon: User, label: 'Profile' },
      { id: 'settings', icon: Settings, label: 'Settings' }
    ];

    const roleSpecificItems = {
      end_user: [
        { id: 'progress', icon: TrendingUp, label: 'Progress' }
      ],
      creator: [
        { id: 'stories', icon: Book, label: 'My Stories' },
        { id: 'create', icon: Book, label: 'Create Story' }
      ],
      narrator: [
        { id: 'narrations', icon: Mic, label: 'My Narrations' },
        { id: 'available', icon: Book, label: 'Available Stories' }
      ],
      admin: [
        { id: 'pending', icon: Shield, label: 'Pending Content' },
        { id: 'users', icon: Users, label: 'Manage Users' },
        { id: 'analytics', icon: BarChart3, label: 'Analytics' }
      ]
    };

    return [
      ...commonItems,
      ...(roleSpecificItems[user?.role] || [])
    ];
  };

  const navigationItems = getNavigationItems();

  return (
    <div className={`bg-white border-r shadow-sm transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    } flex flex-col`}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Book className="w-6 h-6 text-orange-500" />
              <span className="font-semibold text-gray-900">StoryBridge</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={`w-full justify-start ${isCollapsed ? 'px-2' : 'px-3'} ${
                  isActive ? 'bg-orange-500 hover:bg-orange-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => onViewChange(item.id)}
              >
                <Icon className={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {user?.role === 'end_user' ? 'Student' : user?.role}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;