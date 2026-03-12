import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getUnreadNotificationCount } from '../lib/api';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) { setUnreadCount(0); return; }
    fetchCount();

    const channel = supabase
      .channel('notif-count:' + user.id)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications',
        filter: 'user_id=eq.' + user.id
      }, fetchCount)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchCount = async () => {
    if (!user) return;
    const { count } = await getUnreadNotificationCount(user.id);
    setUnreadCount(count || 0);
  };

  return { unreadCount, refresh: fetchCount };
}
