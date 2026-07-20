-- Minimal development seed. Not applied by `d1 migrations apply`; run explicitly
-- (see README "로컬 DB"). Enough data to exercise list/detail/filter/통판 paths.

INSERT INTO events (slug, title, alias, fare_id, date_label, start_date, end_date, venue, map_url, status)
VALUES ('cw-2026-07', '코믹월드 SUMMER 2026', '7월 서코', 334, '2026-07-18~19', '2026-07-18', '2026-07-19', '일산 킨텍스 제1전시장', 'https://example.com/map', 'active');

INSERT INTO ips (name) VALUES ('걸즈밴드크라이');

INSERT INTO circles (event_id, slug, name) VALUES
  ((SELECT id FROM events WHERE slug='cw-2026-07'), 'sample-booth', '샘플 부스 서클'),
  ((SELECT id FROM events WHERE slug='cw-2026-07'), 'sample-tsuhan', '샘플 통판 서클');

INSERT INTO participations (circle_id, event_id, genre_label, genre_tags, booth, day, booth_url, highlight, badge, note, status)
VALUES
  ((SELECT id FROM circles WHERE event_id=(SELECT id FROM events WHERE slug='cw-2026-07') AND slug='sample-booth'),  (SELECT id FROM events WHERE slug='cw-2026-07'), '걸밴크', '["걸밴크","오리지널"]', 'A-01', '18', 'https://example.com/booth', 1, '전문', '샘플 노트', 'confirmed'),
  ((SELECT id FROM circles WHERE event_id=(SELECT id FROM events WHERE slug='cw-2026-07') AND slug='sample-tsuhan'), (SELECT id FROM events WHERE slug='cw-2026-07'), '걸밴크', '["걸밴크"]', NULL, NULL, NULL, 0, NULL, '통판 전용', 'unlisted');

INSERT INTO circle_ips (circle_id, ip_id)
SELECT c.id, i.id FROM circles c, ips i
WHERE c.event_id=(SELECT id FROM events WHERE slug='cw-2026-07') AND i.name='걸즈밴드크라이';

INSERT INTO links (participation_id, kind, label, url, sort_order)
VALUES ((SELECT p.id FROM participations p JOIN circles c ON c.id=p.circle_id WHERE c.event_id=(SELECT id FROM events WHERE slug='cw-2026-07') AND c.slug='sample-booth'), 'x', 'X(트위터)', 'https://x.com/sample', 0);

INSERT INTO tweet_infos (participation_id, url, og_title, og_description, og_image, og_site_name)
VALUES ((SELECT p.id FROM participations p JOIN circles c ON c.id=p.circle_id WHERE c.event_id=(SELECT id FROM events WHERE slug='cw-2026-07') AND c.slug='sample-booth'), 'https://x.com/sample/status/1', '샘플 트윗', '설명', 'https://example.com/og.png', 'X');
