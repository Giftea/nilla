-- Add functions to increment stats and update streaks

-- Function to increment a stat counter
CREATE OR REPLACE FUNCTION increment_stat(
    p_user_id UUID,
    p_stat_name TEXT
)
RETURNS void AS $$
BEGIN
    EXECUTE format(
        'UPDATE public.user_stats SET %I = %I + 1, updated_at = NOW() WHERE user_id = $1',
        p_stat_name,
        p_stat_name
    ) USING p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update streak on contribution
CREATE OR REPLACE FUNCTION update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_last_contribution TIMESTAMPTZ;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
    v_days_since_last INTEGER;
    v_old_streak INTEGER;
BEGIN
    -- Get current stats
    SELECT last_contribution_at, current_streak, longest_streak
    INTO v_last_contribution, v_current_streak, v_longest_streak
    FROM public.user_stats
    WHERE user_id = p_user_id;

    v_old_streak := v_current_streak;

    -- Calculate days since last contribution
    IF v_last_contribution IS NULL THEN
        -- First contribution ever
        v_current_streak := 1;
    ELSE
        v_days_since_last := EXTRACT(DAY FROM (CURRENT_DATE - v_last_contribution::date));

        IF v_days_since_last = 0 THEN
            -- Same day, streak stays the same (already counted today)
            NULL;
        ELSIF v_days_since_last = 1 THEN
            -- Consecutive day, increment streak
            v_current_streak := v_current_streak + 1;
        ELSE
            -- Streak broken, reset to 1
            v_current_streak := 1;
        END IF;
    END IF;

    -- Update longest streak if current is higher
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    -- Update the stats
    UPDATE public.user_stats
    SET current_streak = v_current_streak,
        longest_streak = v_longest_streak,
        last_contribution_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Award streak badges if milestones reached
    IF v_current_streak >= 3 AND v_old_streak < 3 THEN
        PERFORM check_and_award_badge(p_user_id, 'streak_3'::badge_type);
    END IF;
    IF v_current_streak >= 7 AND v_old_streak < 7 THEN
        PERFORM check_and_award_badge(p_user_id, 'streak_7'::badge_type);
    END IF;
    IF v_current_streak >= 14 AND v_old_streak < 14 THEN
        PERFORM check_and_award_badge(p_user_id, 'streak_14'::badge_type);
    END IF;
    IF v_current_streak >= 30 AND v_old_streak < 30 THEN
        PERFORM check_and_award_badge(p_user_id, 'streak_30'::badge_type);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
