using Xamarin.Forms;

namespace TidewaterDriver.Controls
{
    // An entry with rounded corners; the platform renderers draw the border.
    public class RoundedEntry : Entry
    {
        public static readonly BindableProperty CornerRadiusProperty =
            BindableProperty.Create(nameof(CornerRadius), typeof(double), typeof(RoundedEntry), 12.0);

        public static readonly BindableProperty BorderColorProperty =
            BindableProperty.Create(nameof(BorderColor), typeof(Color), typeof(RoundedEntry), Color.Gray);

        public double CornerRadius
        {
            get => (double)GetValue(CornerRadiusProperty);
            set => SetValue(CornerRadiusProperty, value);
        }

        public Color BorderColor
        {
            get => (Color)GetValue(BorderColorProperty);
            set => SetValue(BorderColorProperty, value);
        }

        public Rectangle HitArea => new Rectangle(0, 0, Width, Height);
    }
}
