--
-- PostgreSQL database dump
--

\restrict pE7OjfZfop3J9Qwm86uRWz0E3LpnJgpgCeofkAFmatxeJZhi5gRIQuMcDaGB52m

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: hint_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hint_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_round_id uuid NOT NULL,
    previous_count integer NOT NULL,
    new_count integer NOT NULL,
    changed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role text DEFAULT 'ADMIN'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['ADMIN'::text, 'PARTICIPANT'::text])))
);


--
-- Name: rounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_number integer NOT NULL,
    name text NOT NULL,
    status text DEFAULT 'NOT_STARTED'::text NOT NULL,
    started_at timestamp with time zone,
    stopped_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rounds_status_check CHECK ((status = ANY (ARRAY['NOT_STARTED'::text, 'ACTIVE'::text, 'STOPPED'::text, 'COMPLETED'::text])))
);


--
-- Name: stage_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stage_progress (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_round_id uuid NOT NULL,
    stage_id uuid NOT NULL,
    status text DEFAULT 'NOT_STARTED'::text NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stage_progress_status_check CHECK ((status = ANY (ARRAY['NOT_STARTED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text])))
);


--
-- Name: stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_id uuid NOT NULL,
    stage_number integer NOT NULL,
    name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: team_rounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_rounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    round_id uuid NOT NULL,
    status text DEFAULT 'NOT_STARTED'::text NOT NULL,
    current_stage integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    total_time_ms bigint DEFAULT 0 NOT NULL,
    hints_used integer DEFAULT 0 NOT NULL,
    score numeric,
    marks_one numeric,
    marks_two numeric,
    vault_code_verified boolean DEFAULT false NOT NULL,
    qualified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT team_rounds_hints_used_check CHECK (((hints_used >= 0) AND (hints_used <= 3))),
    CONSTRAINT team_rounds_status_check CHECK ((status = ANY (ARRAY['NOT_STARTED'::text, 'IN_PROGRESS'::text, 'PAUSED'::text, 'COMPLETED'::text, 'DISQUALIFIED'::text])))
);


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_name text NOT NULL,
    college_name text NOT NULL,
    contact_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT teams_college_name_check CHECK (((char_length(college_name) >= 1) AND (char_length(college_name) <= 180))),
    CONSTRAINT teams_contact_email_check CHECK (((contact_email IS NULL) OR ((char_length(contact_email) >= 3) AND (char_length(contact_email) <= 254)))),
    CONSTRAINT teams_team_name_check CHECK (((char_length(team_name) >= 1) AND (char_length(team_name) <= 120)))
);


--
-- Name: vault_unlocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vault_unlocks (
    id bigint NOT NULL,
    chit_code text NOT NULL,
    team_name text NOT NULL,
    mcq_score integer DEFAULT 0 NOT NULL,
    unlocked_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT vault_unlocks_mcq_score_check CHECK (((mcq_score >= 0) AND (mcq_score <= 2)))
);


--
-- Name: vault_unlocks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vault_unlocks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vault_unlocks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vault_unlocks_id_seq OWNED BY public.vault_unlocks.id;


--
-- Name: vault_unlocks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vault_unlocks ALTER COLUMN id SET DEFAULT nextval('public.vault_unlocks_id_seq'::regclass);


--
-- Data for Name: hint_logs; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.hint_logs (id, team_round_id, previous_count, new_count, changed_by, created_at) FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, role, created_at, updated_at) FROM stdin;
16cb9582-124b-4041-b23b-d1c79067b928	ADMIN	2026-09-15 10:19:14.797142+05:30	2026-09-15 10:19:14.797142+05:30
\.


--
-- Data for Name: rounds; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.rounds (id, round_number, name, status, started_at, stopped_at, created_at, updated_at) FROM stdin;
fc91a378-0884-45a4-b67a-23a7e4b5538a	2	Round 2 â€” Challenge Arena	NOT_STARTED	\N	\N	2026-09-15 10:19:14.82401+05:30	2026-09-15 11:51:07.957332+05:30
3a43ae9e-3dd2-47f4-880f-053f966cabc3	3	Round 3 â€” Final Arena	NOT_STARTED	\N	\N	2026-09-15 10:19:14.82401+05:30	2026-09-15 11:51:07.957332+05:30
a6131f42-4ff0-4dc8-8880-0ff9d43bce76	1	Round 1	STOPPED	2026-09-15 11:51:30.984073+05:30	2026-09-15 11:52:14.334508+05:30	2026-09-15 11:51:08.001518+05:30	2026-09-15 11:52:14.334508+05:30
\.


--
-- Data for Name: stage_progress; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stage_progress (id, team_round_id, stage_id, status, started_at, completed_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: stages; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.stages (id, round_id, stage_number, name, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: team_rounds; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.team_rounds (id, team_id, round_id, status, current_stage, started_at, completed_at, total_time_ms, hints_used, score, marks_one, marks_two, vault_code_verified, qualified, created_at, updated_at) FROM stdin;
e3b28868-d897-4778-92c3-469a5f93f9e5	a122e0f8-0e3a-47aa-bf6b-3d0bfc2cbf9c	a6131f42-4ff0-4dc8-8880-0ff9d43bce76	COMPLETED	0	\N	2026-09-15 11:52:09.494957+05:30	19037	0	599	\N	\N	t	f	2026-09-15 11:51:08.004268+05:30	2026-09-15 11:52:43.160535+05:30
0b086a77-7ce7-4ee0-be8d-1c356df8ec92	3fffb79a-fe11-4d54-8340-b8cbf25f6544	a6131f42-4ff0-4dc8-8880-0ff9d43bce76	COMPLETED	0	\N	2026-09-15 11:52:06.975261+05:30	21857	0	598	\N	\N	t	f	2026-09-15 11:51:08.004268+05:30	2026-09-15 11:52:43.160535+05:30
\.


--
-- Data for Name: teams; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.teams (id, team_name, college_name, contact_email, created_at, updated_at) FROM stdin;
3fffb79a-fe11-4d54-8340-b8cbf25f6544	Sample	SSN	\N	2026-09-15 10:44:14.771549+05:30	2026-09-15 10:44:14.771549+05:30
a122e0f8-0e3a-47aa-bf6b-3d0bfc2cbf9c	AnirudhandCo	MIT	\N	2026-09-15 10:44:25.733095+05:30	2026-09-15 10:44:25.733095+05:30
\.


--
-- Data for Name: vault_unlocks; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.vault_unlocks (id, chit_code, team_name, mcq_score, unlocked_at) FROM stdin;
\.


--
-- Name: vault_unlocks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vault_unlocks_id_seq', 1, true);


--
-- Name: hint_logs hint_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hint_logs
    ADD CONSTRAINT hint_logs_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: rounds rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rounds
    ADD CONSTRAINT rounds_pkey PRIMARY KEY (id);


--
-- Name: rounds rounds_round_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rounds
    ADD CONSTRAINT rounds_round_number_key UNIQUE (round_number);


--
-- Name: stage_progress stage_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_progress
    ADD CONSTRAINT stage_progress_pkey PRIMARY KEY (id);


--
-- Name: stage_progress stage_progress_team_round_id_stage_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_progress
    ADD CONSTRAINT stage_progress_team_round_id_stage_id_key UNIQUE (team_round_id, stage_id);


--
-- Name: stages stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_pkey PRIMARY KEY (id);


--
-- Name: stages stages_round_id_stage_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_round_id_stage_number_key UNIQUE (round_id, stage_number);


--
-- Name: team_rounds team_rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_rounds
    ADD CONSTRAINT team_rounds_pkey PRIMARY KEY (id);


--
-- Name: team_rounds team_rounds_team_id_round_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_rounds
    ADD CONSTRAINT team_rounds_team_id_round_id_key UNIQUE (team_id, round_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: vault_unlocks vault_unlocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vault_unlocks
    ADD CONSTRAINT vault_unlocks_pkey PRIMARY KEY (id);


--
-- Name: hint_logs_team_round_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX hint_logs_team_round_id_idx ON public.hint_logs USING btree (team_round_id);


--
-- Name: idx_team_rounds_leaderboard_r1; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_rounds_leaderboard_r1 ON public.team_rounds USING btree (round_id, score DESC NULLS LAST, total_time_ms);


--
-- Name: idx_team_rounds_leaderboard_r2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_rounds_leaderboard_r2 ON public.team_rounds USING btree (round_id, total_time_ms) WHERE (status = 'COMPLETED'::text);


--
-- Name: idx_team_rounds_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_rounds_lookup ON public.team_rounds USING btree (round_id, status);


--
-- Name: idx_team_rounds_qualified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_rounds_qualified ON public.team_rounds USING btree (round_id, qualified) WHERE (qualified = true);


--
-- Name: rounds_round_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rounds_round_number_idx ON public.rounds USING btree (round_number);


--
-- Name: rounds_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX rounds_status_idx ON public.rounds USING btree (status);


--
-- Name: team_rounds_qualified_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_rounds_qualified_idx ON public.team_rounds USING btree (qualified);


--
-- Name: team_rounds_round_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_rounds_round_id_idx ON public.team_rounds USING btree (round_id);


--
-- Name: team_rounds_team_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX team_rounds_team_id_idx ON public.team_rounds USING btree (team_id);


--
-- Name: teams_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX teams_created_at_idx ON public.teams USING btree (created_at DESC);


--
-- Name: vault_unlocks_chit_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vault_unlocks_chit_code_idx ON public.vault_unlocks USING btree (chit_code);


--
-- Name: vault_unlocks_team_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vault_unlocks_team_name_idx ON public.vault_unlocks USING btree (team_name);


--
-- Name: vault_unlocks_unlocked_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX vault_unlocks_unlocked_at_idx ON public.vault_unlocks USING btree (unlocked_at DESC);


--
-- Name: profiles trg_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: rounds trg_rounds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rounds_updated_at BEFORE UPDATE ON public.rounds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: stage_progress trg_stage_progress_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stage_progress_updated_at BEFORE UPDATE ON public.stage_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: stages trg_stages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_stages_updated_at BEFORE UPDATE ON public.stages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: team_rounds trg_team_rounds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_team_rounds_updated_at BEFORE UPDATE ON public.team_rounds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: teams trg_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: hint_logs hint_logs_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hint_logs
    ADD CONSTRAINT hint_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id);


--
-- Name: hint_logs hint_logs_team_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hint_logs
    ADD CONSTRAINT hint_logs_team_round_id_fkey FOREIGN KEY (team_round_id) REFERENCES public.team_rounds(id) ON DELETE CASCADE;


--
-- Name: stage_progress stage_progress_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_progress
    ADD CONSTRAINT stage_progress_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.stages(id) ON DELETE CASCADE;


--
-- Name: stage_progress stage_progress_team_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stage_progress
    ADD CONSTRAINT stage_progress_team_round_id_fkey FOREIGN KEY (team_round_id) REFERENCES public.team_rounds(id) ON DELETE CASCADE;


--
-- Name: stages stages_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stages
    ADD CONSTRAINT stages_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: team_rounds team_rounds_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_rounds
    ADD CONSTRAINT team_rounds_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON DELETE CASCADE;


--
-- Name: team_rounds team_rounds_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_rounds
    ADD CONSTRAINT team_rounds_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict pE7OjfZfop3J9Qwm86uRWz0E3LpnJgpgCeofkAFmatxeJZhi5gRIQuMcDaGB52m

