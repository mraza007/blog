module ReadingTimeFilter
  def reading_time(input)
    words_per_minute = 180
    words = input.split.size
    minutes = (words / words_per_minute).floor
    remaining_seconds = ((words % words_per_minute) / (words_per_minute / 60.0)).round

    if minutes < 1
      "#{remaining_seconds} sec read"
    elsif minutes == 1
      "1 min read"
    else
      "#{minutes} min read"
    end
  end
end

Liquid::Template.register_filter(ReadingTimeFilter)
