import { Router, Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { CONFIG } from '../config';
import { PublicWatchData } from '@cloudcast/shared';

const router = Router();
const db = new DatabaseSync(CONFIG.DATABASE_PATH);

router.get('/:slugOrId', (req: Request, res: Response): void => {
  const param = req.params.slugOrId;

  const row = db.prepare(`
    SELECT s.id, s.name, s.description, s.sport, s.status, s.thumbnailUrl, s.isPublicWatchEnabled,
           e.title as eventTitle, e.competition as eventComp, e.homeTeam, e.awayTeam, e.startTime as eventStartTime,
           d.type as destType
    FROM streams s
    LEFT JOIN events e ON s.eventId = e.id
    LEFT JOIN destinations d ON s.destinationId = d.id
    WHERE (s.id = ? OR s.publicWatchSlug = ?) AND s.isPublicWatchEnabled = 1
  `).get(param, param) as any;

  if (!row) {
    res.status(404).json({ error: 'Public broadcast watch page not found or has been made private' });
    return;
  }

  const publicData: PublicWatchData = {
    id: row.id,
    title: row.eventTitle || row.name,
    sport: row.sport,
    competition: row.eventComp,
    homeTeam: row.homeTeam,
    awayTeam: row.awayTeam,
    status: row.status,
    startTime: row.eventStartTime,
    thumbnailUrl: row.thumbnailUrl,
    description: row.description,
    destinationType: row.destType,
    embedType: row.destType === 'YOUTUBE' ? 'YOUTUBE' : 'HLS',
    // Public watch embed does NOT expose any source URLs or keys
  };

  res.json({ watchData: publicData });
});

export default router;
