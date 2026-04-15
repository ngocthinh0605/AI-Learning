module Api
  module V1
    module Ielts
      # Handles all IELTS Reading endpoints.
      # Actions are kept thin — business logic lives in AI services and models.
      class ReadingController < ApplicationController
        # Reason: Rails wrap_parameters middleware nests JSON body params under the
        # controller name (:reading), which conflicts with our flat param structure.
        wrap_parameters false

        before_action :set_passage, only: [:submit]
        before_action :set_attempt, only: [:attempt, :review]

        # POST /api/v1/ielts/reading/passages
        def generate
          service = Ai::ReadingPassageService.new(
            difficulty:   generate_params[:difficulty] || "band_6",
            topic:        generate_params[:topic],
            passage_type: generate_params[:passage_type] || "academic"
          )

          result = service.call

          if result[:status] == :success
            data    = result[:data]
            passage = current_user.ielts_reading_passages.create!(
              title:        data[:title],
              body:         data[:body],
              questions:    data[:questions],
              difficulty:   generate_params[:difficulty] || "band_6",
              passage_type: generate_params[:passage_type] || "academic",
              topic:        generate_params[:topic]
            )
            render json: passage, serializer: IeltsReadingPassageSerializer, status: :created
          else
            render json: { error: result[:error] }, status: :unprocessable_entity
          end
        end

        # POST /api/v1/ielts/reading/passages/:id/submit
        def submit
          answers    = submit_params[:answers].to_h
          time_taken = submit_params[:time_taken_seconds]

          service = Ai::ReadingEvaluationService.new(
            @passage.questions, answers, passage_body: @passage.body
          )
          result = service.call

          if result[:status] == :success
            attempt = current_user.ielts_reading_attempts.create!(
              ielts_reading_passage: @passage,
              answers:               answers,
              score:                 result[:score],
              total_questions:       result[:total],
              time_taken_seconds:    time_taken,
              feedback:              result[:feedback],
              completed_at:          Time.current
            )

            persist_user_answers!(attempt, @passage.questions, answers, result)
            IeltsWeaknessProfile.upsert_for_user!(current_user)
            current_user.increment!(:xp_points, xp_for_score(result[:score], result[:total]))

            render json: attempt, serializer: IeltsReadingAttemptSerializer, status: :created
          else
            render json: { error: result[:error] }, status: :unprocessable_entity
          end
        end

        # GET /api/v1/ielts/reading/attempts
        def attempts
          page     = (params[:page] || 1).to_i
          per_page = 10

          all_attempts = current_user.ielts_reading_attempts
            .completed.recent_first
            .includes(:ielts_reading_passage)

          total   = all_attempts.count
          records = all_attempts.offset((page - 1) * per_page).limit(per_page)

          render json: {
            attempts: ActiveModelSerializers::SerializableResource.new(
              records, each_serializer: IeltsReadingAttemptSerializer
            ),
            meta: { total: total, page: page, per_page: per_page,
                    pages: (total.to_f / per_page).ceil }
          }
        end

        # GET /api/v1/ielts/reading/attempts/:id
        def attempt
          render json: @attempt, serializer: IeltsReadingAttemptSerializer
        end

        # GET /api/v1/ielts/reading/attempts/:id/review
        # Returns the attempt with wrong answers, AI explanations, and similar questions.
        def review
          wrong_answers = IeltsUserAnswer.for_attempt(@attempt.id).wrong
            .order(:question_id)

          wrong_question_ids = wrong_answers.pluck(:question_id).map(&:to_s)
          wrong_questions    = @attempt.ielts_reading_passage.questions
            .select { |q| wrong_question_ids.include?(q["id"].to_s) }

          similar_result = Ai::SimilarQuestionService.new(
            wrong_questions, @attempt.ielts_reading_passage.body
          ).call

          render json: {
            attempt:           ActiveModelSerializers::SerializableResource.new(
              @attempt, serializer: IeltsReadingAttemptSerializer
            ),
            wrong_answers:     ActiveModelSerializers::SerializableResource.new(
              wrong_answers, each_serializer: IeltsUserAnswerSerializer
            ),
            similar_questions: similar_result[:questions] || []
          }
        end

        # GET /api/v1/ielts/reading/weakness
        def weakness
          profile = current_user.ielts_weakness_profile ||
                    IeltsWeaknessProfile.upsert_for_user!(current_user)
          render json: profile, serializer: IeltsWeaknessProfileSerializer
        end

        # GET /api/v1/ielts/reading/training
        # Generates micro-exercises based on the user's weakest skill.
        def training_exercises
          profile       = current_user.ielts_weakness_profile
          weakness_type = profile&.weakest_type || "paraphrase"

          # Use a recent passage snippet for context, or a generic one
          recent_passage = current_user.ielts_reading_passages.order(created_at: :desc).first
          snippet        = recent_passage&.body&.truncate(1500) || ""

          result = Ai::TrainingExerciseService.new(
            weakness_type:   weakness_type,
            passage_snippet: snippet,
            count:           (params[:count] || 3).to_i
          ).call

          if result[:status] == :success
            render json: {
              weakness_type: weakness_type,
              exercises:     result[:exercises]
            }
          else
            render json: { error: result[:error] }, status: :unprocessable_entity
          end
        end

        private

        def set_passage
          @passage = current_user.ielts_reading_passages.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Passage not found" }, status: :not_found
        end

        def set_attempt
          @attempt = current_user.ielts_reading_attempts
            .includes(:ielts_reading_passage)
            .find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Attempt not found" }, status: :not_found
        end

        def generate_params
          params.permit(:difficulty, :topic, :passage_type)
        end

        def submit_params
          # Reason: :id is provided by the route for /passages/:id/submit.
          # Permitting it here prevents noisy "Unpermitted parameter: :id" logs.
          params.permit(:id, :time_taken_seconds, answers: {})
        end

        # Creates one IeltsUserAnswer row per question answered.
        def persist_user_answers!(attempt, questions, answers, eval_result)
          weakness_map = (eval_result[:weakness_analysis] || []).index_by { |w| w["id"].to_s }

          questions.each do |q|
            q_id      = q["id"].to_s
            correct   = q["answer"].to_s.strip.upcase
            submitted = answers[q_id].to_s.strip.upcase
            w         = weakness_map[q_id]

            current_user.ielts_user_answers.create!(
              ielts_reading_attempt: attempt,
              question_id:           q["id"],
              question_type:         q["type"],
              user_answer:           submitted,
              correct_answer:        correct,
              is_correct:            submitted == correct,
              error_type:            w&.dig("error_type"),
              explanation:           w&.dig("explanation"),
              suggestion:            w&.dig("suggestion")
            )
          end
        end

        # Reason: reward proportionally so users are motivated even on lower bands.
        def xp_for_score(score, total)
          return 0 if total.zero?
          ratio = score.to_f / total
          case ratio
          when 0...0.5   then 5
          when 0.5...0.7 then 10
          when 0.7...0.85 then 15
          else 20
          end
        end
      end
    end
  end
end
