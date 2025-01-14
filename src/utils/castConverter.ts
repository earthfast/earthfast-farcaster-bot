import { TokenOverride } from '../../bin/triggerSiteCreation';

interface WebhookRequest {
  created_at: number;
  type: string;
  data: {
    object: string;
    hash: string;
    thread_hash: string;
    parent_hash: string | null;
    parent_url: string | null;
    root_parent_url: string | null;
    parent_author: {
      fid: number | null;
    };
    author: {
      object: string;
      fid: number;
      custody_address: string;
      username: string;
      display_name: string;
      pfp_url: string;
      profile: any;
      follower_count: number;
      following_count: number;
      verifications: string[];
      active_status: string;
    };
    text: string;
    timestamp: string;
    embeds: any[];
    reactions: {
      likes: any[];
      recasts: any[];
    };
    replies: {
      count: number;
    };
    mentioned_profiles: any[];
  };
  tokenOverride?: TokenOverride;
}

export function convertCastToWebhookFormat(cast: any, overrideCaster?: string, tokenOverride?: TokenOverride): WebhookRequest {
  // Convert timestamp to Unix timestamp (seconds)
  const created_at = Math.floor(new Date(cast.cast.timestamp).getTime() / 1000);

  const caster = overrideCaster || cast.cast.author.username;

  return {
    created_at,
    type: 'cast.created',
    data: {
      object: 'cast',
      hash: cast.cast.hash,
      thread_hash: cast.cast.thread_hash || cast.cast.hash,
      parent_hash: cast.cast.parent_hash || null,
      parent_url: cast.cast.parent_url || null,
      root_parent_url: cast.cast.root_parent_url || null,
      parent_author: {
        fid: cast.cast.parent_author?.fid || null,
      },
      author: {
        object: 'user',
        fid: cast.cast.author.fid,
        custody_address: cast.cast.author.custody_address || '',
        username: caster,
        display_name: cast.cast.author.display_name,
        pfp_url: cast.cast.author.pfp_url,
        profile: cast.cast.author.profile || {},
        follower_count: cast.cast.author.follower_count || 0,
        following_count: cast.cast.author.following_count || 0,
        verifications: cast.cast.author.verifications || [],
        active_status: 'active', // Default to active since it's not in the original schema
      },
      text: cast.cast.text,
      timestamp: cast.cast.timestamp,
      embeds: cast.cast.embeds || [],
      reactions: {
        likes: cast.cast.reactions?.likes || [],
        recasts: cast.cast.reactions?.recasts || [],
      },
      replies: {
        count: cast.cast.replies?.count || 0,
      },
      mentioned_profiles: cast.cast.mentioned_profiles || [],
    },
    tokenOverride,
  };
} 